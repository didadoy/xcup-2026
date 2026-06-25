"""
API del Mundial 2026.

Diseño pensado para muchos usuarios simultáneos:
- TODO se precalcula en memoria (proyección Monte Carlo + backtest).
- Las peticiones de usuario solo LEEN esa caché → baratas y constantes.
- NO existe ningún endpoint que permita a un usuario forzar el recálculo.
- Un hilo de fondo refresca los datos cada 12 h: descarga resultados nuevos,
  reentrena el modelo y recalcula proyección y backtest, intercambiando la
  caché de forma atómica (sin cortar el servicio).
"""
import asyncio
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import model
import wc2026
import train_model
import backtest

REFRESH_SECONDS = 12 * 3600

STATE = {
    "projection": None,
    "backtest": None,
    "last_refresh": None,
    "next_refresh": None,
    "refreshing": False,
}


def _compute(do_download_retrain: bool):
    """Trabajo pesado (CPU). Se ejecuta en un hilo aparte."""
    if do_download_retrain:
        if train_model.download_results():
            train_model.retrain_and_save()
            model.reload_ratings()
            wc2026.reload_data()
    proj = wc2026.project(force=True)
    bt = backtest.run()

    now = int(time.time())
    proj = {
        **proj,
        "last_updated": now,
        "next_update": now + REFRESH_SECONDS,
        "model": {
            "n_matches": model.META.get("n_matches"),
            "trained_through": model.META.get("trained_through"),
            "source": model.META.get("source"),
        },
    }
    STATE["projection"] = proj
    STATE["backtest"] = bt
    STATE["last_refresh"] = now
    STATE["next_refresh"] = now + REFRESH_SECONDS


async def _refresh_loop():
    while True:
        await asyncio.sleep(REFRESH_SECONDS)
        STATE["refreshing"] = True
        try:
            await asyncio.to_thread(_compute, True)   # con descarga + reentreno
        except Exception as e:
            print("refresh error:", e)
        finally:
            STATE["refreshing"] = False


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Arranque: calcula con los datos/modelo ya presentes (sin descargar).
    await asyncio.to_thread(_compute, False)
    task = asyncio.create_task(_refresh_loop())
    yield
    task.cancel()


app = FastAPI(title="AI World Cup 2026", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_methods=["GET"], allow_headers=["*"])


@app.get("/api/projection")
def projection():
    return STATE["projection"] or {"loading": True}


@app.get("/api/backtest")
def get_backtest():
    return STATE["backtest"] or {"loading": True}


@app.get("/api/status")
def status():
    return {
        "last_refresh": STATE["last_refresh"],
        "next_refresh": STATE["next_refresh"],
        "refreshing": STATE["refreshing"],
        "trained_through": model.META.get("trained_through"),
    }


@app.get("/api/predict/{team_a}/{team_b}")
def predict_match(team_a: str, team_b: str):
    a = team_a.replace("_", " ")
    b = team_b.replace("_", " ")
    if a not in model.RATINGS or b not in model.RATINGS:
        return {"error": f"Selección desconocida: {a} o {b}"}
    return model.get_full_prediction(a, b)


@app.get("/api/health")
def health():
    return {"status": "ok", "ready": STATE["projection"] is not None}
