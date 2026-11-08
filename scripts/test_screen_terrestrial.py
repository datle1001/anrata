import unittest
from screen_terrestrial import interval_matches, point


class ScreeningTests(unittest.TestCase):
    def test_rx_protected_interval_is_used(self):
        protected = [{"lowerMHz": 450, "upperMHz": 450.025, "protectedFrequencyBasis": "RX"}]
        self.assertEqual(len(interval_matches({"freq_min": "450.01", "freq_max": "450.02"}, protected)), 1)

    def test_adjacent_frequency_is_not_silently_included(self):
        self.assertEqual(interval_matches({"freq_min": "450.026", "freq_max": "450.03"}, [{"lowerMHz": 450, "upperMHz": 450.025}]), [])

    def test_invalid_interval_is_not_no_overlap(self):
        self.assertIsNone(interval_matches({"freq_min": "NaN", "freq_max": "450"}, []))

    def test_circle_centre_is_not_transmitter_point(self):
        self.assertIsNone(point({"geo_type": "CIRCLE", "lat_dec": "60", "long_dec": "25"}))

    def test_valid_decimal_point(self):
        self.assertEqual(point({"geo_type": "POINT", "lat_dec": "60", "long_dec": "25"})["latitudeDeg"], 60)


if __name__ == "__main__":
    unittest.main()