import unittest
from screen_space import overlapping


class FrequencyIntervals(unittest.TestCase):
    def test_overlap_is_candidate(self):
        self.assertTrue(overlapping(87.75, 88.05, 87.85, 88.15))

    def test_separated_intervals(self):
        self.assertFalse(overlapping(87.75, 88.05, 88.1, 88.4))

    def test_touching_edges_are_retained(self):
        self.assertTrue(overlapping(87.75, 88.05, 88.05, 88.35))


if __name__ == "__main__":
    unittest.main()