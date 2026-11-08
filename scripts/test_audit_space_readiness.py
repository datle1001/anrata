import unittest
from audit_space_readiness import finite, index, join_state


class InputAudit(unittest.TestCase):
    def test_nonfinite_power_is_missing(self):
        self.assertFalse(finite("NaN"))
        self.assertFalse(finite("inf"))
        self.assertFalse(finite(""))
        self.assertTrue(finite("-22"))

    def test_ambiguous_join_is_not_silently_overwritten(self):
        records = [{"ntc_id": "1", "emi_rcp": "E", "beam_name": "A"}] * 2
        matches = index(records, ("ntc_id", "emi_rcp", "beam_name"))[("1", "E", "A")]
        self.assertEqual(join_state(matches), "ambiguous")
        self.assertEqual([r["csvRow"] for r in matches], [2, 3])

    def test_emitting_and_receiving_beams_are_distinct(self):
        records = [{"ntc_id": "1", "emi_rcp": direction, "beam_name": "A"}
                   for direction in ("E", "R")]
        matches = index(records, ("ntc_id", "emi_rcp", "beam_name"))
        self.assertEqual(len(matches[("1", "E", "A")]), 1)
        self.assertEqual(matches[("1", "E", "A")][0]["raw"]["emi_rcp"], "E")


if __name__ == "__main__":
    unittest.main()