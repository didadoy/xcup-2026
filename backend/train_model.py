"""
Entrena el modelo de predicción con datos REALES.

Fuente: martj42/international_results — ~49.000 partidos internacionales
oficiales (1872 → 2026, incluye el Mundial 2026 jugado hasta la fecha).

Dos componentes, ambos ajustados sobre datos reales:

  1. Elo (World Football Elo Rating System)
     Se procesa TODA la historia cronológicamente. K varía por importancia
     del torneo, con multiplicador por diferencia de goles y ventaja local.
     El Elo final de cada selección = su fuerza actual.

  2. Modelo Poisson de ataque / defensa (scikit-learn PoissonRegressor)
     GLM Poisson con efecto de equipo atacante, equipo defensor y localía.
     Cada partido genera 2 filas (goles local / goles visitante).
     Pesos de muestra = recencia * importancia del torneo, de modo que los
     partidos RECIENTES y de MUNDIAL pesan mucho más (forma actual).

Salida: trained_ratings.json  ← lo carga el backend en caliente.
"""
import csv
import json
import math
import os
from datetime import date

import numpy as np
from sklearn.linear_model import PoissonRegressor

HERE = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(HERE, "data", "results.csv")
OUT_PATH = os.path.join(HERE, "trained_ratings.json")

# ── Importancia del torneo ──────────────────────────────────────────────
# K de Elo (World Football Elo) y peso de goles para el Poisson.
def tournament_weights(name: str):
    n = name.lower()
    if "world cup" in n and "qualif" not in n:
        return 60, 3.0           # fase final del Mundial
    if "olympic" in n:
        return 30, 0.8
    if "qualif" in n:
        return 40, 1.3           # clasificatorios
    if "nations league" in n:
        return 40, 1.4
    if any(k in n for k in ("uefa euro", "copa am", "african cup", "asian cup",
                            "gold cup", "concacaf", "confederations")):
        return 50, 2.0           # torneos continentales
    if "friendly" in n:
        return 20, 0.6
    return 30, 1.0


# Normaliza nombres del dataset → nombres que usa nuestra app
NAME_FIX = {
    "United States": "USA",
    "Korea Republic": "South Korea",
    "Korea DPR": "North Korea",
    "IR Iran": "Iran",
    "Iran": "Iran",
    "Türkiye": "Turkey",
    "Czechia": "Czech Republic",
    "Cabo Verde": "Cape Verde",
    "Côte d'Ivoire": "Ivory Coast",
}
def fix(name): return NAME_FIX.get(name, name)


def load_matches():
    rows = []
    with open(CSV_PATH, encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if r["home_score"] in ("NA", "", None):
                continue
            try:
                hs, as_ = int(r["home_score"]), int(r["away_score"])
            except ValueError:
                continue
            y, m, d = (int(x) for x in r["date"].split("-"))
            rows.append({
                "date": date(y, m, d),
                "home": fix(r["home_team"]),
                "away": fix(r["away_team"]),
                "hs": hs, "as": as_,
                "tournament": r["tournament"],
                "neutral": r["neutral"].strip().upper() == "TRUE",
            })
    rows.sort(key=lambda x: x["date"])
    return rows


# ── 1) ELO ──────────────────────────────────────────────────────────────
def train_elo(matches):
    elo, n_played = {}, {}
    HOME_ADV = 100.0
    for m in matches:
        ra = elo.get(m["home"], 1500.0)
        rb = elo.get(m["away"], 1500.0)
        ha = 0 if m["neutral"] else HOME_ADV
        we = 1 / (1 + 10 ** ((rb - (ra + ha)) / 400))   # esperado local
        diff = m["hs"] - m["as"]
        w = 1.0 if diff > 0 else (0.5 if diff == 0 else 0.0)
        ad = abs(diff)
        g = 1.0 if ad <= 1 else (1.5 if ad == 2 else (11 + ad) / 8)
        k, _ = tournament_weights(m["tournament"])
        delta = k * g * (w - we)
        elo[m["home"]] = ra + delta
        elo[m["away"]] = rb - delta
        n_played[m["home"]] = n_played.get(m["home"], 0) + 1
        n_played[m["away"]] = n_played.get(m["away"], 0) + 1
    return elo, n_played


# ── 2) POISSON ataque/defensa ───────────────────────────────────────────
# Ventana y vida media de la recencia: se da mucho más peso a los partidos
# recientes; los muy antiguos se excluyen del ajuste.
POISSON_YEARS = 8
POISSON_HALF_LIFE_DAYS = int(365 * 2.5)

def train_poisson(matches, years=POISSON_YEARS, half_life_days=POISSON_HALF_LIFE_DAYS):
    cutoff = max(m["date"] for m in matches)
    start = date(cutoff.year - years, cutoff.month, cutoff.day)
    recent = [m for m in matches if m["date"] >= start]

    teams = sorted({m["home"] for m in recent} | {m["away"] for m in recent})
    idx = {t: i for i, t in enumerate(teams)}
    T = len(teams)

    # Diseño: features = [att_one_hot (T) | def_one_hot (T) | is_home]
    X, y, w = [], [], []
    for m in recent:
        rec = 0.5 ** ((cutoff - m["date"]).days / half_life_days)
        _, gw = tournament_weights(m["tournament"])
        weight = rec * gw
        ha, hd = idx[m["home"]], idx[m["away"]]
        # fila 1: goles del local
        row = np.zeros(2 * T + 1)
        row[ha] = 1; row[T + hd] = 1; row[-1] = 0 if m["neutral"] else 1
        X.append(row); y.append(m["hs"]); w.append(weight)
        # fila 2: goles del visitante
        row = np.zeros(2 * T + 1)
        row[hd] = 1; row[T + ha] = 1; row[-1] = 0
        X.append(row); y.append(m["as"]); w.append(weight)

    X = np.array(X); y = np.array(y); w = np.array(w)
    model = PoissonRegressor(alpha=1e-3, max_iter=600, fit_intercept=True)
    model.fit(X, y, sample_weight=w)

    coef = model.coef_
    mu = float(model.intercept_)
    home_adv = float(coef[-1])
    attack = {t: float(coef[idx[t]]) for t in teams}
    defense = {t: float(coef[T + idx[t]]) for t in teams}
    n_recent = {t: 0 for t in teams}
    for m in recent:
        n_recent[m["home"]] += 1; n_recent[m["away"]] += 1
    return {"mu": mu, "home_adv": home_adv,
            "attack": attack, "defense": defense, "n_recent": n_recent}


DATA_URL = "https://raw.githubusercontent.com/martj42/international_results/master/results.csv"


def download_results(url: str = DATA_URL, timeout: int = 60) -> bool:
    """Descarga el CSV de resultados actualizado. Devuelve True si lo logró
    (conserva el anterior si falla la red)."""
    import httpx
    try:
        r = httpx.get(url, timeout=timeout, follow_redirects=True)
        r.raise_for_status()
        if len(r.content) < 100_000:        # respuesta sospechosamente pequeña
            return False
        os.makedirs(os.path.dirname(CSV_PATH), exist_ok=True)
        with open(CSV_PATH, "wb") as f:
            f.write(r.content)
        return True
    except Exception:
        return False


def retrain_and_save() -> dict:
    """Reentrena Elo + Poisson desde el CSV y escribe trained_ratings.json.
    Sin prints (apto para hilo de fondo). Devuelve el meta."""
    matches = load_matches()
    elo, n_played = train_elo(matches)
    poi = train_poisson(matches)

    teams = {}
    for t, e in elo.items():
        teams[t] = {
            "elo": round(e, 1),
            "attack": round(poi["attack"].get(t, 0.0), 4),
            "defense": round(poi["defense"].get(t, 0.0), 4),
            "n_total": n_played.get(t, 0),
            "n_recent": poi["n_recent"].get(t, 0),
            "in_poisson": t in poi["attack"],
        }
    out = {
        "params": {"mu": round(poi["mu"], 4), "home_adv": round(poi["home_adv"], 4)},
        "teams": teams,
        "meta": {
            "n_matches": len(matches),
            "trained_through": str(matches[-1]["date"]),
            "source": "martj42/international_results",
        },
    }
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    return out["meta"]


def main():
    meta = retrain_and_save()
    print(f"Guardado → {OUT_PATH}")
    print(f"Partidos: {meta['n_matches']}  hasta {meta['trained_through']}")


if __name__ == "__main__":
    main()
