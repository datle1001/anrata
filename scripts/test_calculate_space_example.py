import math
import unittest

from calculate_space_example import conditional_pfd, geometry, WGS84_A_M, NOMINAL_GSO_RADIUS_M


class SpaceCalculationTests(unittest.TestCase):
    def test_equatorial_subsatellite_geometry(self):
        result = geometry(0, 66, 66)
        self.assertAlmostEqual(result["slantRangeM"], 35785863.0, places=5)
        self.assertAlmostEqual(result["arrivalAngleDeg"], 90.0, places=5)

    def test_equatorial_quadrature(self):
        result = geometry(0, 0, 90)
        self.assertAlmostEqual(result["slantRangeM"], math.hypot(WGS84_A_M, NOMINAL_GSO_RADIUS_M), places=5)
        self.assertFalse(result["aboveGeometricHorizon"])

    def test_pole_has_no_gso_visibility(self):
        self.assertFalse(geometry(90, 24, 66)["aboveGeometricHorizon"])

    def test_inverse_square_flux(self):
        self.assertAlmostEqual(conditional_pfd(0, 0, 2, 1) - conditional_pfd(0, 0, 1, 1), -6.020599913279624)

    def test_reference_bandwidth_4000_hz(self):
        self.assertAlmostEqual(conditional_pfd(0, 0, 1), 36.020599913279625 - 10 * math.log10(4 * math.pi))

    def test_worst_case_gain_added_once(self):
        self.assertAlmostEqual(conditional_pfd(-49.9, 22.6, 40000000) - conditional_pfd(-49.9, 0, 40000000), 22.6)

    def test_invalid_inputs_rejected(self):
        for args in [(91, 0, 0), (0, 181, 0), (0, 0, float("nan"))]:
            with self.assertRaises(ValueError):
                geometry(*args)
        for args in [(0, 0, 0), (float("nan"), 0, 1), (0, 0, 1, 0)]:
            with self.assertRaises(ValueError):
                conditional_pfd(*args)


if __name__ == "__main__":
    unittest.main()