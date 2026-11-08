import math, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from screen_gso_pfd import limit_at, pfd

ROW = {"lowAngleDb": -152, "highAngleDb": -142, "slopeDbPerDeg": 0.5}

def test_limit_low_angle():
    assert limit_at(ROW, 3) == -152

def test_limit_slope_matches_intelsat_example():
    assert abs(limit_at(ROW, 12.2) - (-148.4)) < 1e-9

def test_limit_high_angle():
    assert limit_at(ROW, 40) == -142

def test_pfd_formula():
    d = 38_000_000
    expected = -48.3 + 36.9 + 10 * math.log10(4000) - 10 * math.log10(4 * math.pi * d * d)
    assert abs(pfd(-48.3, 36.9, d, 4000) - expected) < 1e-9
