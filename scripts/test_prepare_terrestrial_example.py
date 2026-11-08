import math
import unittest
from prepare_terrestrial_example import distance_and_bearing, erp_kw, prepare


class PreparationTests(unittest.TestCase):
    def test_one_degree_equator(self):
        distance, bearing = distance_and_bearing(0, 0, 0, 1)
        self.assertAlmostEqual(distance, 111.1950802335, places=6)
        self.assertAlmostEqual(bearing, 90)

    def test_erp_conversion(self):
        self.assertAlmostEqual(erp_kw(30), 1)
        self.assertAlmostEqual(erp_kw(32.3), 1.698243652, places=8)

    def test_invalid_coordinates_rejected(self):
        for lat in (91, math.nan):
            with self.assertRaises(ValueError):
                distance_and_bearing(lat, 0, 0, 0)

    def test_out_of_domain_not_calculated(self):
        data = {'issue': 3076, 'example': {
            'notice': {'raw': {'freq_assgn': '803.5'}},
            'transmitterLocations': [{'reportedPoint': {'latitudeDeg': 0, 'longitudeDeg': 0},
                'antennaEvidence': [{'raw': {'pwr_dbw': '32.3', 'eff_hgtmax': '61'}}]}],
            'matchedFinnishRows': [{'station': '1'}]}}
        finland = {'records': [{'station': '1', 'source': {'row': 1}, 'raw': {'Latitude': 20, 'Longitude': 0}}]}
        path = prepare(data, finland)['paths'][0]
        self.assertFalse(path['withinP1546DistanceDomain'])
        self.assertIsNone(path['fieldStrengthDbUvPerM'])
        self.assertIsNone(path['coordinationMarginDb'])

    def test_duplicate_station_resolves_by_source_row(self):
        first = {'station': '1', 'source': {'row': 1}, 'raw': {'Latitude': 20, 'Longitude': 0}}
        second = {**first, 'source': {'row': 2}, 'raw': {'Latitude': 1, 'Longitude': 0}}
        data = {'issue': 3076, 'example': {
            'notice': {'raw': {'freq_assgn': '803.5'}},
            'transmitterLocations': [{'reportedPoint': {'latitudeDeg': 0, 'longitudeDeg': 0},
                'antennaEvidence': [{'raw': {'pwr_dbw': '32.3', 'eff_hgtmax': '61'}}]}],
            'matchedFinnishRows': [{'station': '1', 'source': {'row': 1}}]}}
        result = prepare(data, {'records': [first, second]})
        self.assertEqual(result['paths'][0]['source']['row'], 1)
        self.assertFalse(result['paths'][0]['withinP1546DistanceDomain'])
        del data['example']['matchedFinnishRows'][0]['source']
        with self.assertRaises(ValueError):
            prepare(data, {'records': [first, second]})


if __name__ == '__main__':
    unittest.main()