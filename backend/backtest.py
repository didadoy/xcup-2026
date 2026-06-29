"""
Backtest HONESTO (out-of-sample) del modelo contra el Mundial 2026 real.

Clave: se reentrena EXCLUYENDO los partidos del Mundial 2026, así que el
modelo NO ha visto ningún resultado que luego predice. Después predice TODOS
los partidos del Mundial 2026 ya jugados (grupos y eliminatorias) y se compara
con la realidad. La muestra crece sola conforme se juegan partidos nuevos.

Métricas:
- Acierto de resultado (1X2)  vs baselines (siempre local / mejor Elo)
- Acierto de marcador exacto
- Brier score y log-loss (calidad de las probabilidades, calibración)
- Error medio de goles (MAE entre xG predicho y goles reales)
"""
import math
import sys

import numpy as np

import train_model as T

sys.stdout.reconfigure(encoding="utf-8")


def build_predictor(train, poi_kwargs=None):
    elo, _ = T.train_elo(train)
    poi = T.train_poisson(train, **(poi_kwargs or {}))
    atks = list(poi["attack"].values())
    defs = list(poi["defense"].values())
    d_att, d_def = float(np.mean(atks)), float(np.mean(defs))
    mu, ha = poi["mu"], poi["home_adv"]

    def lambdas(home, away, neutral):
        ah = poi["attack"].get(home, d_att); dh = poi["defense"].get(home, d_def)
        aa = poi["attack"].get(away, d_att); da = poi["defense"].get(away, d_def)
        adv = 0.0 if neutral else ha
        lh = math.exp(mu + ah + da + adv)
        la = math.exp(mu + aa + dh)
        return max(0.15, lh), max(0.15, la)

    def predict(home, away, neutral):
        lh, la = lambdas(home, away, neutral)
        K = 11
        ph = [math.exp(-lh) * lh ** i / math.factorial(i) for i in range(K)]
        pa = [math.exp(-la) * la ** j / math.factorial(j) for j in range(K)]
        M = np.outer(ph, pa); M /= M.sum()
        home_p = float(np.tril(M, -1).sum())
        draw_p = float(np.trace(M))
        away_p = float(np.triu(M, 1).sum())
        # marcador coherente con el resultado previsto (1/X/2): el más probable
        # DENTRO de ese resultado, para que marcador y acierto no se contradigan
        outcome = max((("H", home_p), ("D", draw_p), ("A", away_p)), key=lambda x: x[1])[0]
        best, bp = (0, 0), -1.0
        for i in range(K):
            for j in range(K):
                ok = (outcome == "H" and i > j) or (outcome == "A" and j > i) or (outcome == "D" and i == j)
                if ok and M[i, j] > bp:
                    bp = M[i, j]; best = (int(i), int(j))
        return {
            "xg_h": lh, "xg_a": la,
            "p_home": home_p, "p_draw": draw_p, "p_away": away_p,
            "score": best,
        }

    return predict, elo


def outcome(hs, as_):
    return "H" if hs > as_ else ("A" if as_ > hs else "D")


def run():
    """Ejecuta el backtest out-of-sample y devuelve métricas + tabla.
    Reentrena EXCLUYENDO el Mundial 2026 (sin fuga de datos)."""
    all_m = T.load_matches()
    is_wc26 = lambda m: m["tournament"] == "FIFA World Cup" and m["date"].year == 2026
    train = [m for m in all_m if not is_wc26(m)]
    test = [m for m in all_m if is_wc26(m)]

    try:
        from wc2026 import TEAM_GROUP
    except Exception:
        TEAM_GROUP = {}

    predict, elo = build_predictor(train)

    table = []
    correct = exact = base_home = base_elo = 0
    brier = brier_base = logloss = goal_ae = 0.0

    for m in test:
        pr = predict(m["home"], m["away"], m["neutral"])
        probs = {"H": pr["p_home"], "D": pr["p_draw"], "A": pr["p_away"]}
        pred_out = max(probs, key=probs.get)
        real_out = outcome(m["hs"], m["as"])
        ok = pred_out == real_out

        correct += ok
        exact += pr["score"] == (m["hs"], m["as"])
        base_home += real_out == "H"
        base_elo += (("H" if elo.get(m["home"], 1500) >= elo.get(m["away"], 1500) else "A") == real_out)
        for k in "HDA":
            y = 1.0 if real_out == k else 0.0
            brier += (probs[k] - y) ** 2
            brier_base += (1/3 - y) ** 2
        logloss += -math.log(max(1e-9, probs[real_out]))
        goal_ae += abs(pr["xg_h"] - m["hs"]) + abs(pr["xg_a"] - m["as"])

        table.append({
            "date": str(m["date"]), "group": TEAM_GROUP.get(m["home"]),
            "home": m["home"], "away": m["away"],
            "pred": f"{pr['score'][0]}-{pr['score'][1]}",
            "real": f"{m['hs']}-{m['as']}",
            "p_home": round(pr["p_home"] * 100), "p_draw": round(pr["p_draw"] * 100),
            "p_away": round(pr["p_away"] * 100),
            "correct": ok,
        })

    n = max(1, len(test))
    return {
        "train_matches": len(train),
        "test_matches": len(test),
        "accuracy_1x2": round(correct / n * 100, 1),
        "baseline_home": round(base_home / n * 100, 1),
        "baseline_elo": round(base_elo / n * 100, 1),
        "exact_score": round(exact / n * 100, 1),
        "brier": round(brier / n, 3),
        "brier_baseline": round(brier_base / n, 3),
        "logloss": round(logloss / n, 3),
        "logloss_baseline": round(math.log(3), 3),
        "goal_mae": round(goal_ae / (2 * n), 2),
        "table": table,
    }


def main():
    r = run()
    print(f"Entreno con {r['train_matches']} partidos (SIN Mundial 2026).")
    print(f"Test: {r['test_matches']} partidos de grupos ya jugados.\n")
    print("=== RESULTADOS (out-of-sample) ===")
    print(f"Acierto 1X2     : {r['accuracy_1x2']}%  "
          f"(local {r['baseline_home']}% · mejor Elo {r['baseline_elo']}%)")
    print(f"Marcador exacto : {r['exact_score']}%")
    print(f"Brier (↓)       : {r['brier']}  (uniforme {r['brier_baseline']})")
    print(f"Log-loss (↓)    : {r['logloss']}  (uniforme {r['logloss_baseline']})")
    print(f"Error de goles  : {r['goal_mae']} goles/equipo\n")
    print(f"{'Local':>16} {'Visit':>16}  Pred Real  1/X/2        OK")
    for t in r["table"]:
        print(f"{t['home']:>16} {t['away']:>16}  {t['pred']} {t['real']}  "
              f"{t['p_home']:3d}/{t['p_draw']:3d}/{t['p_away']:3d}  {'OK' if t['correct'] else '.'}")


if __name__ == "__main__":
    main()
