"""
Proyección del cuadro eliminatorio del Mundial 2026 con DATOS REALES.

- Grupos oficiales A-L (verificados contra los fixtures reales).
- Resultados reales jugados hasta la fecha (results.csv).
- Partidos de grupo que faltan: se simulan con el modelo entrenado.
- Cuadro oficial de 16avos→final (slot chart FIFA), incluyendo la
  asignación de los 8 mejores terceros respetando las restricciones
  oficiales de grupo elegible por hueco.

Nada de esto está inventado: los cruces salen de la estructura oficial
y de simular los partidos reales que quedan.
"""
import csv
import os
from collections import defaultdict

import numpy as np

import model as M

HERE = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(HERE, "data", "results.csv")

RNG = np.random.default_rng(7)

# ── Grupos oficiales (letra → equipos), verificados ─────────────────────
GROUPS = {
    "A": ["Mexico", "South Africa", "South Korea", "Czech Republic"],
    "B": ["Canada", "Bosnia and Herzegovina", "Qatar", "Switzerland"],
    "C": ["Brazil", "Morocco", "Haiti", "Scotland"],
    "D": ["USA", "Paraguay", "Australia", "Turkey"],
    "E": ["Germany", "Curaçao", "Ivory Coast", "Ecuador"],
    "F": ["Netherlands", "Japan", "Sweden", "Tunisia"],
    "G": ["Belgium", "Egypt", "Iran", "New Zealand"],
    "H": ["Spain", "Cape Verde", "Saudi Arabia", "Uruguay"],
    "I": ["France", "Senegal", "Iraq", "Norway"],
    "J": ["Argentina", "Algeria", "Austria", "Jordan"],
    "K": ["Portugal", "DR Congo", "Uzbekistan", "Colombia"],
    "L": ["England", "Croatia", "Ghana", "Panama"],
}
TEAM_GROUP = {t: g for g, ts in GROUPS.items() for t in ts}

NAME_FIX = {
    "United States": "USA", "Korea Republic": "South Korea",
    "IR Iran": "Iran", "Türkiye": "Turkey", "Czechia": "Czech Republic",
    "Cabo Verde": "Cape Verde", "Côte d'Ivoire": "Ivory Coast",
}
def _fix(t): return NAME_FIX.get(t, t)

# ── Cuadro oficial: slots de cada partido de 16avos (match 73-88) ───────
#   '1X'=ganador grupo X · '2X'=segundo grupo X · '3:NN'=mejor tercero
R32_SLOTS = {
    73: ("2A", "2B"),  74: ("1E", "3:74"), 75: ("1F", "2C"),
    76: ("1C", "2F"),  77: ("1I", "3:77"), 78: ("2E", "2I"),
    79: ("1A", "3:79"), 80: ("1L", "3:80"), 81: ("1D", "3:81"),
    82: ("1G", "3:82"), 83: ("2K", "2L"),  84: ("1H", "2J"),
    85: ("1B", "3:85"), 86: ("1J", "2H"),  87: ("1K", "3:87"),
    88: ("2D", "2G"),
}
# Grupos elegibles para cada hueco de tercero (restricción oficial)
THIRD_ELIGIBLE = {
    "3:74": set("ABCDF"), "3:77": set("CDFGH"), "3:79": set("CEFHI"),
    "3:80": set("EHIJK"), "3:81": set("BEFIJ"), "3:82": set("AEHIJ"),
    "3:85": set("EFGIJ"), "3:87": set("DEIJL"),
}
# Orden de las hojas del cuadro (izq→der) para emparejar por pares consecutivos
R32_ORDER = [74, 77, 73, 75, 83, 84, 81, 82, 76, 78, 79, 80, 86, 88, 85, 87]


def _load_matches():
    played, remaining = [], []
    with open(CSV_PATH, encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if r["tournament"] != "FIFA World Cup" or r["date"] < "2026-01-01":
                continue
            h, a = _fix(r["home_team"]), _fix(r["away_team"])
            if h not in TEAM_GROUP or a not in TEAM_GROUP:
                continue
            if r["home_score"] in ("NA", ""):
                remaining.append((h, a))
            else:
                played.append((h, a, int(r["home_score"]), int(r["away_score"])))
    return played, remaining


PLAYED, REMAINING = _load_matches()


def reload_data():
    """Recarga los partidos del CSV (tras actualizar datos) y limpia caché."""
    global PLAYED, REMAINING
    PLAYED, REMAINING = _load_matches()
    _CACHE.clear()


def base_standings():
    """Puntos/GF/GC reales acumulados de los partidos ya jugados."""
    st = {t: {"pts": 0, "gf": 0, "ga": 0, "pj": 0} for t in TEAM_GROUP}
    for h, a, hs, as_ in PLAYED:
        st[h]["gf"] += hs; st[h]["ga"] += as_; st[h]["pj"] += 1
        st[a]["gf"] += as_; st[a]["ga"] += hs; st[a]["pj"] += 1
        if hs > as_:   st[h]["pts"] += 3
        elif hs < as_: st[a]["pts"] += 3
        else:          st[h]["pts"] += 1; st[a]["pts"] += 1
    return st


def _rank_key(t, st, jitter):
    s = st[t]
    return (s["pts"], s["gf"] - s["ga"], s["gf"], jitter.get(t, 0))


def _assign_thirds(third_by_group):
    """Empareja terceros clasificados a huecos respetando elegibilidad.
    third_by_group: {grupo: equipo}. Devuelve {slot_id: equipo} o None."""
    slots = list(THIRD_ELIGIBLE.keys())
    groups = list(third_by_group.keys())
    result = {}

    def bt(i, used):
        if i == len(groups):
            return True
        g = groups[i]
        for s in slots:
            if s in result:
                continue
            if g in THIRD_ELIGIBLE[s]:
                result[s] = third_by_group[g]
                if bt(i + 1, used):
                    return True
                del result[s]
        return False

    return result if bt(0, set()) else None


def _simulate_once(jitter):
    """Una iteración: simula lo que falta de grupos y resuelve el cuadro.
    Devuelve (slot_team por posición de cada ronda, campeón)."""
    st = base_standings()
    # simular partidos restantes
    for h, a in REMAINING:
        la, lb = M.expected_goals(h, a)
        gh, ga = int(RNG.poisson(la)), int(RNG.poisson(lb))
        st[h]["gf"] += gh; st[h]["ga"] += ga
        st[a]["gf"] += ga; st[a]["ga"] += gh
        if gh > ga:   st[h]["pts"] += 3
        elif gh < ga: st[a]["pts"] += 3
        else:         st[h]["pts"] += 1; st[a]["pts"] += 1

    firsts, seconds, thirds = {}, {}, {}
    for g, teams in GROUPS.items():
        ordered = sorted(teams, key=lambda t: _rank_key(t, st, jitter), reverse=True)
        firsts[g], seconds[g], thirds[g] = ordered[0], ordered[1], ordered[2]

    # 8 mejores terceros
    third_rank = sorted(GROUPS.keys(),
                        key=lambda g: _rank_key(thirds[g], st, jitter), reverse=True)
    qualbest = third_rank[:8]
    third_by_group = {g: thirds[g] for g in qualbest}
    third_slot = _assign_thirds(third_by_group) or {}

    def resolve(slot):
        if slot.startswith("1"): return firsts[slot[1]]
        if slot.startswith("2"): return seconds[slot[1]]
        return third_slot.get(slot)              # '3:NN'

    # R32 en orden de cuadro
    leaves = []
    for mid in R32_ORDER:
        sa, sb = R32_SLOTS[mid]
        leaves.append((resolve(sa), resolve(sb)))

    # registrar ocupantes por ronda y jugar el cuadro
    rounds = {"r32": [], "r16": [], "qf": [], "sf": [], "final": [], "champion": None}
    rounds["r32"] = [t for pair in leaves for t in pair]   # 32 equipos en orden

    cur = []
    for ta, tb in leaves:
        if ta is None or tb is None:
            cur.append(ta or tb); continue
        cur.append(M.simulate_match(ta, tb)["winner"])
    rounds["r16"] = list(cur)                               # 16

    for name, size in (("qf", 8), ("sf", 4), ("final", 2)):
        nxt = []
        for i in range(0, len(cur) - 1, 2):
            nxt.append(M.simulate_match(cur[i], cur[i + 1])["winner"])
        rounds[name] = list(nxt)
        cur = nxt
    if len(cur) == 2:
        rounds["champion"] = M.simulate_match(cur[0], cur[1])["winner"]
    return rounds


def assign_entrants(r32_counts, n):
    """Asigna un equipo distinto a cada uno de los 32 huecos de 16avos,
    maximizando la probabilidad total (cuántas veces el equipo ocupó el hueco
    en la simulación). Evita que un mismo equipo aparezca en dos huecos."""
    from scipy.optimize import linear_sum_assignment

    teams = sorted({t for c in r32_counts.values() for t in c})
    if len(teams) < 32:
        # fallback: modal por hueco (no debería pasar)
        ent = [max(r32_counts.get(i, {1: 1}), key=r32_counts.get(i, {1: 1}).get)
               if r32_counts.get(i) else None for i in range(32)]
        return ent, [None] * 32

    tidx = {t: i for i, t in enumerate(teams)}
    W = np.zeros((len(teams), 32))
    for slot in range(32):
        for t, cnt in r32_counts.get(slot, {}).items():
            W[tidx[t], slot] = cnt

    row, col = linear_sum_assignment(-W)        # maximiza peso
    entrants = [None] * 32
    qual = [None] * 32
    for r, c in zip(row, col):
        entrants[c] = teams[r]
        qual[c] = round(W[r, c] / n * 100)
    return entrants, qual


_CACHE = {}

def project(n: int = 8000, force: bool = False):
    if not force and _CACHE.get("n") == n:
        return _CACHE["data"]

    # contadores: posición -> equipo -> veces
    pos_counts = {r: defaultdict(lambda: defaultdict(int))
                  for r in ("r32", "r16", "qf", "sf", "final")}
    champ = defaultdict(int)
    reach = {r: defaultdict(int) for r in ("r16", "qf", "sf", "final", "champion")}

    for _ in range(n):
        jitter = {t: RNG.random() for t in TEAM_GROUP}
        r = _simulate_once(jitter)
        for idx, t in enumerate(r["r32"]):
            if t: pos_counts["r32"][idx][t] += 1
        for rd in ("r16", "qf", "sf", "final"):
            for idx, t in enumerate(r[rd]):
                if t:
                    pos_counts[rd][idx][t] += 1
                    reach[rd][t] += 1
        if r["champion"]:
            champ[r["champion"]] += 1
            reach["champion"][r["champion"]] += 1

    # 32 equipos de entrada — asignación uno-a-uno óptima para que NINGÚN
    # equipo se repita (cada selección ocupa un solo hueco de 16avos).
    entrants, entry_qual = assign_entrants(pos_counts["r32"], n)

    # Cuadro COHERENTE: avanza el favorito de cada cruce, y ese mismo equipo
    # aparece en la ronda siguiente (sin incoherencias entre rondas).
    bracket = {}
    cur = list(entrants)
    cur_meta = [{"qual": entry_qual[i]} for i in range(32)]
    for name in ("r32", "r16", "qf", "sf", "final"):
        slots, winners, wmeta = [], [], []
        for i in range(0, len(cur), 2):
            a, b = cur[i], cur[i + 1]
            if a and b:
                pa = M.advance_prob(a, b)
                a_adv = pa >= 0.5
                slots.append({"team": a, "prob": round(pa * 100), "win": a_adv,
                              "qual": cur_meta[i].get("qual")})
                slots.append({"team": b, "prob": round((1 - pa) * 100), "win": not a_adv,
                              "qual": cur_meta[i + 1].get("qual")})
                winners.append(a if a_adv else b)
                wmeta.append({})
            else:
                t = a or b
                slots.append({"team": a, "prob": None, "win": bool(a), "qual": cur_meta[i].get("qual")})
                slots.append({"team": b, "prob": None, "win": bool(b), "qual": cur_meta[i + 1].get("qual")})
                winners.append(t); wmeta.append({})
        bracket[name] = slots
        cur, cur_meta = winners, wmeta
    champion = cur[0] if cur else None

    # tabla de favoritos
    teams_tbl = []
    for t in TEAM_GROUP:
        teams_tbl.append({
            "team": t, "group": TEAM_GROUP[t],
            "r16":   round(reach["r16"][t] / n * 100, 1),
            "qf":    round(reach["qf"][t] / n * 100, 1),
            "sf":    round(reach["sf"][t] / n * 100, 1),
            "final": round(reach["final"][t] / n * 100, 1),
            "champion": round(reach["champion"][t] / n * 100, 1),
        })
    teams_tbl.sort(key=lambda x: -x["champion"])

    data = {
        "simulations": n,
        "bracket": bracket,
        "champion": champion,
        "favourites": teams_tbl,
        "groups": current_group_tables(),
        "remaining_group_matches": len(REMAINING),
        "played_group_matches": len(PLAYED),
    }
    _CACHE["n"] = n; _CACHE["data"] = data
    return data


def current_group_tables():
    """Clasificación REAL actual de cada grupo (solo partidos jugados)."""
    st = base_standings()
    out = {}
    for g, teams in GROUPS.items():
        ordered = sorted(
            teams,
            key=lambda t: (st[t]["pts"], st[t]["gf"] - st[t]["ga"], st[t]["gf"]),
            reverse=True)
        out[g] = [{
            "team": t, "pj": st[t]["pj"], "pts": st[t]["pts"],
            "gf": st[t]["gf"], "ga": st[t]["ga"],
            "gd": st[t]["gf"] - st[t]["ga"],
        } for t in ordered]
    return out


if __name__ == "__main__":
    import json, sys
    sys.stdout.reconfigure(encoding="utf-8")
    d = project(3000)
    print(f"Sims: {d['simulations']}  jugados: {d['played_group_matches']}  "
          f"faltan: {d['remaining_group_matches']}")
    print("\nTop-12 favoritos al título:")
    for r in d["favourites"][:12]:
        print(f"  {r['champion']:5.1f}%  {r['team']:16s} (Grupo {r['group']})  "
              f"R16 {r['r16']:.0f}  QF {r['qf']:.0f}  SF {r['sf']:.0f}")
    print("\n16avos proyectados (cruce más probable):")
    r32 = d["bracket"]["r32"]
    for i in range(0, len(r32), 2):
        a, b = r32[i], r32[i + 1]
        print(f"  {a['team']:16s} ({a['prob']:2d}%) vs {b['team']:16s} ({b['prob']:2d}%)")
