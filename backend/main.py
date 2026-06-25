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
import json
import os
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

# El resultado se guarda en disco para que un reinicio/arranque NO vuelva a
# simular: se carga el guardado si sigue vigente. Sube CACHE_VERSION si cambias
# la estructura de datos.
_DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
CACHE_FILE = os.path.join(_DATA_DIR, "state_cache.json")    # runtime (gitignored)
SEED_FILE = os.path.join(_DATA_DIR, "state_seed.json")      # semilla commiteada (fallback)
CACHE_VERSION = 2

STATE = {
    "projection": None,
    "backtest": None,
    "last_refresh": None,
    "next_refresh": None,
    "refreshing": False,
}


def _persist():
    try:
        os.makedirs(os.path.dirname(CACHE_FILE), exist_ok=True)
        with open(CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump({"v": CACHE_VERSION,
                       "projection": STATE["projection"],
                       "backtest": STATE["backtest"]}, f, ensure_ascii=False)
    except Exception as e:
        print("persist error:", e)


def _read_cache(path):
    try:
        with open(path, encoding="utf-8") as f:
            c = json.load(f)
        if c.get("v") != CACHE_VERSION or not c.get("projection"):
            return None
        return c
    except Exception:
        return None


def _load_persisted():
    # Runtime primero; si no, la semilla commiteada (para arranques en frío).
    return _read_cache(CACHE_FILE) or _read_cache(SEED_FILE)


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
    _persist()    # guarda en disco para que un reinicio no vuelva a simular


async def _refresh_loop():
    # Arranque: si hay resultado guardado en disco, se sirve YA (aunque esté
    # algo caducado) para que NADIE vea pantalla de carga. Si está caducado, se
    # recalcula por detrás (los usuarios ven los datos viejos + "Actualizando…").
    # Solo la PRIMERÍSIMA vez (sin nada guardado) hay que calcular antes de servir.
    persisted = _load_persisted()
    if persisted:
        STATE["projection"] = persisted["projection"]
        STATE["backtest"] = persisted["backtest"]
        STATE["last_refresh"] = persisted["projection"].get("last_updated")
        STATE["next_refresh"] = persisted["projection"].get("next_update")
        print("cache en disco cargada (sin simular en el arranque)")
        if time.time() >= (STATE["next_refresh"] or 0):
            STATE["refreshing"] = True
            try:
                await asyncio.to_thread(_compute, False)   # caducada → refresca por detrás
            except Exception as e:
                print("refresh-on-start error:", e)
            finally:
                STATE["refreshing"] = False
    else:
        STATE["refreshing"] = True
        try:
            await asyncio.to_thread(_compute, False)
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
