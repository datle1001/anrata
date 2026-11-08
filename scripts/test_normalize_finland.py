import unittest
from normalize_finland import effective_bandwidth, protected_frequency, quantity_mhz


class OrganizerRules(unittest.TestCase):
    def test_rx_takes_priority(self):
        self.assertEqual(protected_frequency(450, 460), (460, "RX"))

    def test_missing_rx_uses_tx(self):
        self.assertEqual(protected_frequency(450, None), (450, "TX fallback"))

    def test_smaller_bandwidth(self):
        self.assertEqual(effective_bandwidth(.3, .2), .2)

    def test_organizer_specific_bandwidth_examples(self):
        self.assertEqual(effective_bandwidth(.009, .010), .009)
        self.assertEqual(effective_bandwidth(2.5, 118.6), 2.5)

    def test_non_positive_bandwidth_remains_unavailable(self):
        self.assertIsNone(effective_bandwidth(0, -1))

    def test_units(self):
        self.assertEqual(quantity_mhz("300.000 kHz"), .3)
        self.assertEqual(quantity_mhz("300k"), .3)
        self.assertEqual(quantity_mhz("1.2 GHz"), 1200)
        self.assertIsNone(quantity_mhz("300"))

    def test_itu_bandwidth_notation(self):
        self.assertEqual(quantity_mhz("8M00"), 8)
        self.assertEqual(quantity_mhz("10k0"), .01)
        self.assertEqual(quantity_mhz("10K0"), .01)

    def test_dataset_lowercase_bandwidth(self):
        self.assertEqual(quantity_mhz("7,6k"), .0076)
        self.assertEqual(quantity_mhz("1,4M"), 1.4)
        self.assertEqual(quantity_mhz("0,1G"), 100)


if __name__ == "__main__":
    unittest.main()