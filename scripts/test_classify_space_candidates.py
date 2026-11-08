import unittest
from classify_space_candidates import classify


class LinkTriage(unittest.TestCase):
    def test_specific_earth_station_is_not_a_satellite(self):
        self.assertEqual(classify("S", "missing", ["TC"], 0), "outside_satellite_notice_scope")

    def test_intersatellite_is_separate(self):
        self.assertEqual(classify("G", "matched", ["ES"], 0), "space_endpoint_or_intersatellite_review")

    def test_associated_space_endpoint_is_separate_even_without_es(self):
        self.assertEqual(classify("N", "matched", ["EI"], 1), "space_endpoint_or_intersatellite_review")

    def test_missing_service_is_not_silently_accepted(self):
        self.assertEqual(classify("G", "matched", [], 0), "missing_service_class")

    def test_active_sensor_is_separate(self):
        self.assertEqual(classify("N", "matched", ["E3"], 0), "sensor_service_separate_review")

    def test_mobile_satellite_is_not_mistaken_for_intersatellite(self):
        self.assertEqual(classify("N", "matched", ["EI"], 0), "downlink_review_pool_destination_unverified")


if __name__ == "__main__":
    unittest.main()