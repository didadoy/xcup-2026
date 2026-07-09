"""Tests de la lógica del cuadro (filtrado de grupo, terceros, penaltis)."""
import textwrap

import pytest

import wc2026 as W


HEADER = "date,home_team,away_team,home_score,away_score,tournament,city,country,neutral\n"


def _write_csv(tmp_path, rows):
    p = tmp_path / "results.csv"
    p.write_text(HEADER + "".join(rows), encoding="utf-8")
    return str(p)


@pytest.fixture
def use_csv(tmp_path, monkeypatch):
    """Apunta wc2026 a un CSV de prueba y recarga; restaura al final."""
    def _apply(rows, shootouts=""):
        csv_path = _write_csv(tmp_path, rows)
        sp = tmp_path / "shootouts.csv"
        sp.write_text("date,home_team,away_team,winner,first_shooter\n" + shootouts, encoding="utf-8")
        monkeypatch.setattr(W, "CSV_PATH", csv_path)
        monkeypatch.setattr(W, "SHOOTOUTS_PATH", str(sp))
        W.reload_data()
        return csv_path
    return _apply


def _wc(date, home, away, hs="NA", as_="NA", neutral="TRUE"):
    return f"{date},{home},{away},{hs},{as_},FIFA World Cup,City,Country,{neutral}\n"


# ── Filtrado: solo partidos DE GRUPO (mismo grupo) ──────────────────────
def test_only_same_group_matches_counted(use_csv):
    rows = [
        _wc("2026-06-15", "Spain", "Cape Verde", "2", "0"),      # grupo H (mismo grupo)
        _wc("2026-07-02", "Spain", "Austria", "1", "0"),         # cruce H vs J → NO es de grupo
    ]
    use_csv(rows)
    played_pairs = {(h, a) for h, a, *_ in W.PLAYED}
    assert ("Spain", "Cape Verde") in played_pairs
    assert ("Spain", "Austria") not in played_pairs        # eliminatoria excluida


# ── Asignación de terceros: respeta la elegibilidad oficial ─────────────
def test_assign_thirds_respects_eligibility():
    # Elegimos 8 grupos cualesquiera con tercero; la asignación debe colocar
    # cada grupo en un hueco cuya lista de elegibles lo incluya.
    third_by_group = {g: f"3rd_{g}" for g in "ABCDEFGH"}
    slot = W._assign_thirds(third_by_group)
    assert slot is not None
    inv = {team: s for s, team in slot.items()}
    for g in "ABCDEFGH":
        s = inv[f"3rd_{g}"]
        assert g in W.THIRD_ELIGIBLE[s]        # el grupo es elegible para su hueco
    assert len(set(slot.values())) == 8        # 8 terceros distintos, 8 huecos


# ── Penaltis: ganador inferido de la ronda siguiente ────────────────────
def test_penalty_winner_inferred_from_next_round(use_csv):
    # 16avos empatado (penaltis) sin shootouts.csv: el que aparece en octavos pasó.
    rows = [
        _wc("2026-06-29", "Germany", "Paraguay", "1", "1"),     # empate → penaltis
        _wc("2026-07-04", "Paraguay", "France"),                # Paraguay sigue vivo en 8vos
    ]
    use_csv(rows)
    res = W._knockout_results()
    r = res[frozenset(("Germany", "Paraguay"))]
    assert r["pens"] is True
    assert r["winner"] == "Paraguay"


# ── Penaltis: shootouts.csv tiene prioridad ─────────────────────────────
def test_penalty_winner_from_shootouts_file(use_csv):
    rows = [_wc("2026-07-19", "Spain", "Argentina", "1", "1")]   # final empatada
    use_csv(rows, shootouts="2026-07-19,Spain,Argentina,Argentina,Spain\n")
    res = W._knockout_results()
    r = res[frozenset(("Spain", "Argentina"))]
    assert r["pens"] is True
    assert r["winner"] == "Argentina"          # de shootouts, aun sin ronda posterior


def test_decisive_knockout_winner_by_score(use_csv):
    rows = [_wc("2026-06-28", "South Africa", "Canada", "0", "1")]
    use_csv(rows)
    res = W._knockout_results()
    r = res[frozenset(("South Africa", "Canada"))]
    assert r["pens"] is False
    assert r["winner"] == "Canada"
