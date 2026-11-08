import unittest
from satellite_pfd_criteria import gso_fss_3400_4200_limit


class Table214Criterion(unittest.TestCase):
    def limit(self, angle):
        return gso_fss_3400_4200_limit(angle, 3725.5, 3759.5,
                                      applicability_confirmed=True)

    def test_zero_to_five_degree_limit(self):
        self.assertEqual(self.limit(0)["limitDbwPerM2"], -152)
        self.assertEqual(self.limit(5)["limitDbwPerM2"], -152)

    def test_five_to_twentyfive_degree_slope(self):
        self.assertEqual(self.limit(15)["limitDbwPerM2"], -147)

    def test_twentyfive_to_ninety_degree_limit(self):
        self.assertEqual(self.limit(25)["limitDbwPerM2"], -142)
        self.assertEqual(self.limit(90)["limitDbwPerM2"], -142)

    def test_reference_bandwidth_is_four_khz(self):
        self.assertEqual(self.limit(15)["referenceBandwidthHz"], 4000)

    def test_unconfirmed_applicability_is_blocked(self):
        with self.assertRaises(ValueError):
            gso_fss_3400_4200_limit(15, 3725.5, 3759.5)

    def test_other_band_is_not_assessed(self):
        with self.assertRaises(ValueError):
            gso_fss_3400_4200_limit(15, 4200, 4201, applicability_confirmed=True)

    def test_invalid_angle_is_not_assessed(self):
        for angle in (-1, 91, float("nan")):
            with self.assertRaises(ValueError):
                self.limit(angle)


if __name__ == "__main__":
    unittest.main()