import math
import unittest
from terrestrial_criteria import coordination_criterion


class CriterionTests(unittest.TestCase):
    def test_applicability_gate(self):
        with self.assertRaises(ValueError):
            coordination_criterion(450, 450.025)

    def test_all_five_thresholds(self):
        for lo, hi, expected in [(30, 31, 0), (50, 51, 6), (150, 151, 12), (390, 391, 18), (450, 451, 20)]:
            with self.subTest(lo=lo):
                self.assertEqual(coordination_criterion(lo, hi, applicability_confirmed=True)["criterionDbUvPerM"], expected)

    def test_reference_parameters(self):
        r = coordination_criterion(450, 450.025, applicability_confirmed=True)
        self.assertEqual((r["referenceBandwidthHz"], r["timePercentage"], r["locationPercentage"], r["receivingHeightM"]), (25000, 10, 50, 10))

    def test_above_470_requires_challenge_confirmation(self):
        with self.assertRaises(ValueError):
            coordination_criterion(801, 806, applicability_confirmed=True)
        r = coordination_criterion(801, 806, applicability_confirmed=True, challenge_extension_confirmed=True)
        self.assertEqual(r["criterionDbUvPerM"], 20)
        self.assertTrue(r["challengeExtension"])

    def test_uniform_spectrum_gate(self):
        with self.assertRaises(ValueError):
            coordination_criterion(450, 451, applicability_confirmed=True, channel_spacing_khz=1000)

    def test_confirmed_bandwidth_conversion(self):
        r = coordination_criterion(450, 451, applicability_confirmed=True, channel_spacing_khz=1000, uniform_spectrum_confirmed=True)
        self.assertAlmostEqual(r["criterionDbUvPerM"], 20 + 10 * math.log10(40))
        self.assertEqual(r["referenceBandwidthHz"], 1000000)

    def test_boundary_spanning_rejected(self):
        with self.assertRaises(ValueError):
            coordination_criterion(399, 401, applicability_confirmed=True)


if __name__ == "__main__":
    unittest.main()