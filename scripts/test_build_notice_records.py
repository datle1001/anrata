import unittest
from build_notice_records import score, gso_visible

W = {"pointsPerFinnishStation": 5, "finnishStationPointsCap": 40, "overlapRowsPerPoint": 10, "overlapRowPointsCap": 20,
     "visibilityPoints": 15, "missingInputPoints": 15, "newInIssuePoints": 10, "highThreshold": 60, "mediumThreshold": 30}


class T(unittest.TestCase):
    def test_station_points_capped_at_40(self):
        total, _, _ = score({"finnishStations": 20, "overlapRows": 0, "visibleFromFinland": False, "missingPower": False, "newThisIssue": False}, W)
        self.assertEqual(total, 40)

    def test_high_band_at_60(self):
        total, band, _ = score({"finnishStations": 9, "overlapRows": 0, "visibleFromFinland": True, "missingPower": True, "newThisIssue": False}, W)
        self.assertEqual((total, band), (70, "high"))

    def test_low_band_below_30(self):
        _, band, _ = score({"finnishStations": 1, "overlapRows": 5, "visibleFromFinland": False, "missingPower": False, "newThisIssue": False}, W)
        self.assertEqual(band, "low")

    def test_gso_visibility(self):
        self.assertTrue(gso_visible(66))
        self.assertFalse(gso_visible(-120))


if __name__ == "__main__":
    unittest.main()
