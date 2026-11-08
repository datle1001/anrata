import unittest
from prepare_m4_evidence import normalize, match_interval


class M4EvidenceTests(unittest.TestCase):
    def test_explicit_hz_is_converted_to_mhz(self):
        records = normalize({'value': [{'ID': 9, 'Sub_band_lower_limit__Hz_': 150000000, 'Sub_band_upper_limit__Hz_': 151000000}]})
        self.assertEqual((records[0]['lowerMHz'], records[0]['upperMHz']), (150, 151))
        self.assertEqual(match_interval(150.5, 150.6, records), [9])
        self.assertEqual(match_interval(160, 161, records), [])

    def test_invalid_numeric_input_retains_raw_without_guessing_text(self):
        raw = {'ID': 2, 'Sub_band_lower_limit__Hz_': None, 'Sub_band_upper_limit__Hz_': 1000, 'Sub_band_lower_limit': '0.1 kHz'}
        records = normalize({'value': [raw]})
        self.assertIsNone(records[0]['lowerMHz'])
        self.assertEqual(records[0]['raw'], raw)
        self.assertIsNone(match_interval(None, 1, records))