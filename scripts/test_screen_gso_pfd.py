import math, sys, unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from screen_gso_pfd import limit_at, pfd, select_limit, classification, confirmed_applicability

ROW = {"lowAngleDb": -152, "highAngleDb": -142, "slopeDbPerDeg": 0.5}

class BulkPfdTests(unittest.TestCase):
    def test_limit_low_angle(self):
        self.assertEqual(limit_at(ROW, 3), -152)

    def test_limit_slope(self):
        self.assertAlmostEqual(limit_at(ROW, 12.2), -148.4)

    def test_limit_high_angle(self):
        self.assertEqual(limit_at(ROW, 40), -142)

    def test_pfd_formula(self):
        d = 38_000_000
        expected = -48.3 + 36.9 + 10 * math.log10(4000) - 10 * math.log10(4 * math.pi * d * d)
        self.assertAlmostEqual(pfd(-48.3, 36.9, d, 4000), expected)

    def test_partial_band_never_gets_whole_group_limit(self):
        row = {'lowMHz': 17700, 'highMHz': 19300}
        self.assertIsNone(select_limit(17700, 19700, [row]))
        self.assertEqual(select_limit(17700, 19300, [row]), row)

    def test_ambiguous_rows_remain_unresolved(self):
        row = {'lowMHz': 3400, 'highMHz': 4200}
        self.assertIsNone(select_limit(3500, 3600, [row, row]))

    def test_modifiable_buffer(self):
        self.assertEqual(classification(-2, 3), 'near-limit')
        self.assertEqual(classification(-2, 1), 'within')
        with self.assertRaises(ValueError):
            classification(-2, -1)

    def test_numeric_fields_do_not_confirm_applicability(self):
        row = {'service': 'FSS', 'footnoteCheck': 'Review footnote'}
        value = {'service': 'FSS', 'applicabilityConfirmed': True, 'powerEnvelopeConfirmed': True, 'evidenceReference': 'reviewed case'}
        self.assertFalse(confirmed_applicability(value, row))
        self.assertTrue(confirmed_applicability({**value, 'footnotesConfirmed': True}, row))
        self.assertFalse(confirmed_applicability({**value, 'service': 'BSS', 'footnotesConfirmed': True}, row))
