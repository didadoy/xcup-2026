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
import threading
import time
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import model
import wc2026
import train_model
import backtest

# Horas a las que se recalcula, en la ZONA HORARIA indicada (no UTC).
# Por defecto 00:00 y 12:00 hora de España. Cambia TZ/horas a tu gusto.
SCHEDULE_TZ = ZoneInfo("Europe/Madrid")
SCHEDULE_HOURS = [0, 6, 12, 18]

# El resultado se guarda en disco para que un reinicio/arranque NO vuelva a
# simular: se carga el guardado si sigue vigente. Sube CACHE_VERSION si cambias
# la estructura de datos.
_DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
CACHE_FILE = os.path.join(_DATA_DIR, "state_cache.json")    # runtime (gitignored)
SEED_FILE = os.path.join(_DATA_DIR, "state_seed.json")      # semilla commiteada (fallback)
CACHE_VERSION = 4

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
    """Próxima hora programada (en SCHEDULE_TZ) posterior a `now`, en UTC."""
    now = now or datetime.now(timezone.utc)
    local = now.astimezone(SCHEDULE_TZ)
    cands = []
    for d in (0, 1):
        for h in SCHEDULE_HOURS:
            t = (local + timedelta(days=d)).replace(hour=h, minute=0, second=0, microsecond=0)
            if t > local:
                cands.append(t)
    return min(cands).astimezone(timezone.utc)


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


# Candado para que NUNCA se solapen dos refrescos (lo dispara tanto el
# heartbeat como las peticiones entrantes; ver más abajo).
_refresh_lock = threading.Lock()


def _is_due() -> bool:
    """¿Ya pasó la hora del próximo refresco programado?"""
    return time.time() >= (STATE["next_refresh"] or 0)


def _refresh_now(download: bool):
    """Refresca una sola vez (con descarga+reentreno si download=True).
    Pensado para correr en un hilo aparte vía asyncio.to_thread. Si ya hay
    otro refresco en marcha, sale sin hacer nada."""
    if not _refresh_lock.acquire(blocking=False):
        return                       # ya hay uno en curso
    STATE["refreshing"] = True
    try:
        _compute(download)
    except Exception as e:
        print("refresh error:", e)
    finally:
        STATE["refreshing"] = False
        _refresh_lock.release()


async def _refresh_loop():
    # Arranque: si hay resultado guardado en disco, se sirve YA (aunque esté
    # algo caducado) para que NADIE vea pantalla de carga. Si está caducado, se
    # descarga y recalcula por detrás (los usuarios ven los datos viejos +
    # "Actualizando…"). Solo la PRIMERÍSIMA vez (sin nada guardado) hay que
    # calcular antes de servir.
    persisted = _load_persisted()
    if persisted:
        STATE["projection"] = persisted["projection"]
        STATE["backtest"] = persisted["backtest"]
        STATE["last_refresh"] = persisted["projection"].get("last_updated")
        STATE["next_refresh"] = persisted["projection"].get("next_update")
        print("cache en disco cargada (sin simular en el arranque)")
        if _is_due():
            await asyncio.to_thread(_refresh_now, True)   # caducada → descarga+refresca
    else:
        await asyncio.to_thread(_refresh_now, True)        # primera vez (descarga datos frescos)

    # Heartbeat de respaldo: mientras el proceso siga vivo, comprueba cada par
    # de minutos si toca refrescar. NO dependemos de un único sleep largo (en
    # Render free el proceso se congela/reinicia y ese sleep nunca terminaba):
    # el disparo fiable viene de las PETICIONES (ver /api/status y /api/health),
    # que reviven el proceso y lanzan el refresco si ya toca.
    while True:
        await asyncio.sleep(120)
        if _is_due():
            await asyncio.to_thread(_refresh_now, True)


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


def _kick_refresh_if_due():
    """Si ya toca refrescar y nadie lo está haciendo, lanza el refresco en
    segundo plano (descarga+reentreno) sin bloquear la respuesta. Esto es lo
    que hace que la web se actualice de forma FIABLE en Render free: cada ping
    del keep-alive o cada visita revive el proceso y dispara el recálculo en
    cuanto pasa la franja horaria, sin depender de un temporizador interno."""
    if _is_due() and not STATE["refreshing"]:
        asyncio.create_task(asyncio.to_thread(_refresh_now, True))


@app.get("/api/status")
async def status():
    _kick_refresh_if_due()
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
async def health():
    _kick_refresh_if_due()   # el keep-alive pega aquí cada ~10 min → dispara refresco si toca
    return {"status": "ok", "ready": STATE["projection"] is not None}
