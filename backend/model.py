"""
Modelo de predicción — usa parámetros ENTRENADOS sobre datos reales
(ver train_model.py → trained_ratings.json).

- Elo real (49.453 partidos, 1872→2026) para fuerza global.
- Poisson ataque/defensa entrenado (GLM) para goles esperados.
- La distribución de marcadores se calcula ANALÍTICAMENTE con la PMF de
  Poisson (sin Monte Carlo), así que es exacta y determinista.

Filosofía de presentación: NO se inventa un marcador exacto como titular
(en fútbol internacional ningún marcador supera ~20% de probabilidad). Se
lidera con goles esperados (xG) y probabilidades 1X2, que es lo que varía
de verdad entre partidos.
"""
import json
import math
import os
from collections import defaultdict

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
RATINGS_PATH = os.path.join(HERE, "trained_ratings.json")

RNG = np.random.default_rng(42)
MAX_GOALS = 10                 # truncado de la PMF (cola despreciable)

PARAMS = {}
RATINGS = {}
META = {}
DEFAULT_ATTACK = 0.0
DEFAULT_DEFENSE = 0.0


def reload_ratings():
    """(Re)carga trained_ratings.json en memoria. Permite refrescar el modelo
    sin reiniciar el proceso tras un reentrenamiento."""
    global PARAMS, RATINGS, META, DEFAULT_ATTACK, DEFAULT_DEFENSE
    with open(RATINGS_PATH, encoding="utf-8") as f:
        r = json.load(f)
    PARAMS = r["params"]
    RATINGS = r["teams"]
    META = r.get("meta", {})
    atks = [v["attack"] for v in RATINGS.values() if v.get("in_poisson")]
    defs = [v["defense"] for v in RATINGS.values() if v.get("in_poisson")]
    DEFAULT_ATTACK = float(np.mean(atks)) if atks else 0.0
    DEFAULT_DEFENSE = float(np.mean(defs)) if defs else 0.0


reload_ratings()


def _team(name):
    return RATINGS.get(name)


def get_elo(team: str) -> float:
    t = _team(team)
    return t["elo"] if t else 1500.0


def expected_goals(team_a: str, team_b: str) -> tuple[float, float]:
    """Goles esperados en campo neutral (knockout) según el GLM Poisson."""
    ta, tb = _team(team_a), _team(team_b)
    aa = ta["attack"]  if ta else DEFAULT_ATTACK
    da = ta["defense"] if ta else DEFAULT_DEFENSE
    ab = tb["attack"]  if tb else DEFAULT_ATTACK
    db = tb["defense"] if tb else DEFAULT_DEFENSE
    la = math.exp(PARAMS["mu"] + aa + db)
    lb = math.exp(PARAMS["mu"] + ab + da)
    return max(0.15, la), max(0.15, lb)


def _poisson_pmf(lmbda: float, k: int) -> float:
    return math.exp(-lmbda) * lmbda ** k / math.factorial(k)


def score_matrix(team_a: str, team_b: str):
    """Matriz P(i,j) de marcadores asumiendo Poisson independiente."""
    la, lb = expected_goals(team_a, team_b)
    pa = [_poisson_pmf(la, i) for i in range(MAX_GOALS + 1)]
    pb = [_poisson_pmf(lb, j) for j in range(MAX_GOALS + 1)]
    M = np.outer(pa, pb)
    M /= M.sum()
    return M, la, lb


def expected_goals_venue(home: str, away: str, neutral: bool = True) -> tuple[float, float]:
    """Goles esperados aplicando ventaja local si el partido NO es neutral
    (para partidos de fase de grupos con local designado)."""
    th, ta = _team(home), _team(away)
    ah = th["attack"]  if th else DEFAULT_ATTACK
    dh = th["defense"] if th else DEFAULT_DEFENSE
    aa = ta["attack"]  if ta else DEFAULT_ATTACK
    da = ta["defense"] if ta else DEFAULT_DEFENSE
    adv = 0.0 if neutral else PARAMS["home_adv"]
    lh = math.exp(PARAMS["mu"] + ah + da + adv)
    la = math.exp(PARAMS["mu"] + aa + dh)
    return max(0.15, lh), max(0.15, la)


def predict_fixture(home: str, away: str, neutral: bool = True) -> dict:
    """Predicción de un partido concreto (con local): marcador más probable
    (moda) + probabilidades 1X2."""
    lh, la = expected_goals_venue(home, away, neutral)
    pa = [_poisson_pmf(lh, i) for i in range(MAX_GOALS + 1)]
    pb = [_poisson_pmf(la, j) for j in range(MAX_GOALS + 1)]
    Mx = np.outer(pa, pb); Mx /= Mx.sum()
    i, j = np.unravel_index(int(np.argmax(Mx)), Mx.shape)
    probs = {"home": float(np.tril(Mx, -1).sum()),
             "draw": float(np.trace(Mx)),
             "away": float(np.triu(Mx, 1).sum())}
    outcome = max(probs, key=probs.get)
    return {
        "score": f"{int(i)}-{int(j)}",
        "p_home": round(probs["home"] * 100),
        "p_draw": round(probs["draw"] * 100),
        "p_away": round(probs["away"] * 100),
        "outcome": {"home": "H", "draw": "D", "away": "A"}[outcome],
    }


def match_probabilities(team_a: str, team_b: str) -> dict:
    """1X2 derivado del MISMO modelo Poisson (coherente con los marcadores)."""
    M, _, _ = score_matrix(team_a, team_b)
    home = float(np.tril(M, -1).sum())   # i > j
    draw = float(np.trace(M))            # i == j
    away = float(np.triu(M, 1).sum())    # i < j
    return {
        "home_win": round(home, 4),
        "draw":     round(draw, 4),
        "away_win": round(away, 4),
    }


def advance_prob(team_a: str, team_b: str) -> float:
    """Probabilidad de que A elimine a B en un cruce a partido único
    (incluye prórroga/penaltis), basada en Elo. Neutral."""
    ea, eb = get_elo(team_a), get_elo(team_b)
    return 1 / (1 + 10 ** ((eb - ea) / 400))


def predict_result(team_a: str, team_b: str) -> dict:
    M, la, lb = score_matrix(team_a, team_b)
    probs = match_probabilities(team_a, team_b)

    # Outcome más probable
    outcome = max(("home", "draw", "away"),
                  key=lambda o: probs[{"home": "home_win",
                                       "draw": "draw",
                                       "away": "away_win"}[o]])
    winner = team_a if outcome == "home" else (team_b if outcome == "away" else None)

    # Top marcadores exactos (informativo, con su probabilidad real)
    flat = [((i, j), float(M[i, j]))
            for i in range(MAX_GOALS + 1) for j in range(MAX_GOALS + 1)]
    flat.sort(key=lambda x: -x[1])
    top = flat[:8]
    modal = top[0][0]

    # Marcador esperado redondeado (solo como referencia visual)
    exp_scoreline = f"{round(la)}-{round(lb)}"

    return {
        "predicted_outcome": outcome,
        "predicted_winner":  winner,
        "expected_goals_home": round(la, 2),
        "expected_goals_away": round(lb, 2),
        "expected_scoreline":  exp_scoreline,
        "modal_score":      f"{modal[0]}-{modal[1]}",
        "modal_score_prob": round(top[0][1] * 100, 1),
        "top_scores": [
            {"score": f"{s[0][0]}-{s[0][1]}", "probability": round(s[1] * 100, 1)}
            for s in top
        ],
    }


# ── Simulación de torneo (Monte Carlo) ──────────────────────────────────
def simulate_match(team_a: str, team_b: str, knockout: bool = True) -> dict:
    la, lb = expected_goals(team_a, team_b)
    ga = int(RNG.poisson(la))
    gb = int(RNG.poisson(lb))
    if knockout and ga == gb:
        # prórroga (≈1/3 de partido) y penaltis si sigue empate
        ga += int(RNG.poisson(la * 0.33))
        gb += int(RNG.poisson(lb * 0.33))
        if ga == gb:
            ea, eb = get_elo(team_a), get_elo(team_b)
            p = 1 / (1 + 10 ** ((eb - ea) / 400))
            winner = team_a if RNG.random() < p else team_b
            return {"winner": winner, "score_a": ga, "score_b": gb, "method": "penalties"}
    return {"winner": team_a if ga > gb else (team_b if gb > ga else None),
            "score_a": ga, "score_b": gb, "method": "90min"}


def simulate_bracket(seed_matches: list, n: int = 15000) -> dict:
    """
    seed_matches: lista de partidos de la primera ronda (cualquier tamaño
    potencia de 2: 32, 16...). Devuelve probabilidades de avanzar por ronda.
    """
    valid = [m for m in seed_matches
             if m["home"]["team"] in RATINGS and m["away"]["team"] in RATINGS]
    rounds = int(math.log2(len(valid))) + 1 if valid else 0

    reach = defaultdict(lambda: defaultdict(int))  # team -> round_idx -> count
    champ = defaultdict(int)

    for _ in range(n):
        winners = []
        for m in valid:
            r = simulate_match(m["home"]["team"], m["away"]["team"])
            winners.append(r["winner"])
            reach[m["home"]["team"]][0] += 0  # asegura clave
        # ronda 0 = ya están (primera ronda). Avanzamos.
        rd = 1
        cur = winners
        for t in cur:
            reach[t][rd] += 1
        while len(cur) > 1:
            nxt = []
            for i in range(0, len(cur) - 1, 2):
                r = simulate_match(cur[i], cur[i + 1])
                nxt.append(r["winner"])
            rd += 1
            for t in nxt:
                reach[t][rd] += 1
            cur = nxt
        if cur:
            champ[cur[0]] += 1

    out = {}
    for t, rmap in reach.items():
        out[t] = {f"round_{k}": round(v / n * 100, 2) for k, v in rmap.items()}
        out[t]["win_title"] = round(champ[t] / n * 100, 2)
    return {"rounds": rounds, "teams": out}


def get_full_prediction(team_a: str, team_b: str) -> dict:
    probs = match_probabilities(team_a, team_b)
    result = predict_result(team_a, team_b)
    ea, eb = get_elo(team_a), get_elo(team_b)
    return {
        "team_a": team_a,
        "team_b": team_b,
        "probabilities": probs,
        "result": result,
        "elo": {"home": round(ea), "away": round(eb)},
        "confidence": round(max(probs["home_win"], probs["away_win"]) * 100, 1),
        "favourite": team_a if probs["home_win"] >= probs["away_win"] else team_b,
        "model": {
            "n_matches": META.get("n_matches"),
            "trained_through": META.get("trained_through"),
        },
    }
