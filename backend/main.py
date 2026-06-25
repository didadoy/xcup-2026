"""
API del Mundial 2026.

Diseño pensado para muchos usuarios simultáneos:
- TODO se precalcula en memoria (proyección Monte Carlo + backtest).
- Las peticiones de usuario solo LEEN esa caché → baratas y constantes.
- NO existe ningún endpoint que permita a un usuario forzar el recálculo.
- El recálculo ocurre a HORAS FIJAS (por defecto 00:00 y 12:00 UTC): descarga
  resultados nuevos, reentrena y recalcula, intercambiando la caché en caliente.
- Cada respuesta lleva `next_update` (cuándo habrá datos nuevos), para que el
  frontend solo vuelva a llamar cuando de verdad toque (no en cada visita).
"""
import asyncio
import time
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import model
import wc2026
import train_model
import backtest

# Horas (UTC) a las que se recalcula. Cámbialas si quieres más/menos veces/día.
SCHEDULE_HOURS_UTC = [0, 12]

STATE = {
    "projection": None,
    "backtest": None,
    "last_refresh": None,
    "next_refresh": None,
    "refreshing": False,
}


def _next_slot(now: datetime | None = None) -> datetime:
    """Próxima hora programada (UTC) posterior a `now`."""
    now = now or datetime.now(timezone.utc)
    cands = []
    for d in (0, 1):
        for h in SCHEDULE_HOURS_UTC:
            t = (now + timedelta(days=d)).replace(hour=h, minute=0, second=0, microsecond=0)
            if t > now:
                cands.append(t)
    return min(cands)


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
    nxt = int(_next_slot().timestamp())
    proj = {
        **proj,
        "last_updated": now,
        "next_update": nxt,
        "model": {
            "n_matches": model.META.get("n_matches"),
            "trained_through": model.META.get("trained_through"),
            "source": model.META.get("source"),
        },
    }
    bt = {**bt, "last_updated": now, "next_update": nxt}
    STATE["projection"] = proj
    STATE["backtest"] = bt
    STATE["last_refresh"] = now
    STATE["next_refresh"] = nxt


async def _refresh_loop():
    # Cálculo inicial en segundo plano (no bloquea el arranque del servidor).
    STATE["refreshing"] = True
    try:
        await asyncio.to_thread(_compute, False)      # con datos/modelo presentes
    except Exception as e:
        print("initial compute error:", e)
    finally:
        STATE["refreshing"] = False

    while True:
        nxt = _next_slot()
        wait = (nxt - datetime.now(timezone.utc)).total_seconds()
        await asyncio.sleep(max(1.0, wait))
        STATE["refreshing"] = True
        try:
            await asyncio.to_thread(_compute, True)    # descarga + reentreno
        except Exception as e:
            print("refresh error:", e)
        finally:
            STATE["refreshing"] = False


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(_refresh_loop())
    yield
    task.cancel()


app = FastAPI(title="xCup 2026", lifespan=lifespan)
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
