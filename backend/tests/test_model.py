"""Tests del modelo de predicción (Elo + Poisson)."""
import model


def test_score_matrix_is_a_distribution():
    M, la, lb = model.score_matrix("Spain", "Brazil")
    assert abs(M.sum() - 1.0) < 1e-9          # es una distribución de probabilidad
    assert (M >= 0).all()
    assert la > 0 and lb > 0


def test_match_probabilities_sum_to_one():
    p = model.match_probabilities("France", "Argentina")
    total = p["home_win"] + p["draw"] + p["away_win"]
    assert abs(total - 1.0) < 1e-3


def test_advance_prob_is_complementary():
    a = model.advance_prob("Spain", "Andorra_no_such")   # rival desconocido → 1500
    b = model.advance_prob("Andorra_no_such", "Spain")
    assert abs((a + b) - 1.0) < 1e-9
    assert a > 0.5                                        # España es mucho más fuerte


def test_stronger_team_favoured():
    # Un equipo con Elo mucho mayor debe ser favorito claro.
    top = max(model.RATINGS, key=lambda t: model.RATINGS[t]["elo"])
    p = model.advance_prob(top, "Andorra_no_such")
    assert p > 0.5


def test_predict_fixture_scoreline_matches_outcome():
    # El marcador propuesto debe ser coherente con el resultado 1X2 previsto.
    pr = model.predict_fixture("Spain", "Andorra_no_such", neutral=True)
    hs, as_ = (int(x) for x in pr["score"].split("-"))
    if pr["outcome"] == "H":
        assert hs > as_
    elif pr["outcome"] == "A":
        assert as_ > hs
    else:
        assert hs == as_


def test_score_grid_present_in_full_prediction():
    full = model.get_full_prediction("Spain", "Brazil")
    grid = full["score_grid"]
    assert len(grid) == 6 and len(grid[0]) == 6
    assert all(0 <= c <= 100 for row in grid for c in row)
