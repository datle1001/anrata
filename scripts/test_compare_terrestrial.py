import unittest
from compare_terrestrial import presence_changes


def row(assignment, **kwargs):
    return {"fragment": "NTFD_RR", "adm": "RUS", "assgn_id": assignment, **kwargs}


class PresenceTests(unittest.TestCase):
    def test_missing_does_not_mean_withdrawn(self):
        result = presence_changes([row("1")], [])
        self.assertEqual(result[0]["status"], "Only in previous extract; not proof of withdrawal")

    def test_new_presence_does_not_mean_new_assignment(self):
        result = presence_changes([], [row("1", intent="MODIFY")])
        self.assertEqual(result[0]["status"], "Only in current extract; not proof of new assignment")
        self.assertEqual(result[0]["current"][0]["intent"], "MODIFY")

    def test_duplicates_not_overwritten(self):
        result = presence_changes([], [row("1"), row("1", freq_assgn="450")])
        self.assertEqual(result[0]["status"], "Ambiguous identity; review required")
        self.assertEqual(len(result[0]["current"]), 2)

    def test_concrete_field_change(self):
        result = presence_changes([row("1", freq_assgn="450")], [row("1", freq_assgn="460")])
        self.assertEqual(result[0]["changedFields"], ["freq_assgn"])


if __name__ == "__main__":
    unittest.main()