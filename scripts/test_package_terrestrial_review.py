import unittest
from package_terrestrial_review import package


class PackageTests(unittest.TestCase):
    def test_preserves_every_raw_value_and_source_metadata(self):
        row = {'notice': {'raw': {'terrakey': '1', 'stn_cls': 'FB', 'extra': {'v': [None, 0.002]}}}}
        source = {'issue': 3076, 'scope': 'Frequency only', 'records': [row], 'hashes': {'mdb': 'raw'}}
        out = package(source, 'source-hash', '2026-11-08')
        self.assertEqual(out['records'], [row])
        self.assertEqual(out['sourceMetadata']['hashes'], {'mdb': 'raw'})
        self.assertEqual(out['sourceSha256'], 'source-hash')
        self.assertEqual(out['totalNotices'], 1)

    def test_duplicate_identity_is_not_silently_discarded(self):
        row = {'notice': {'raw': {'terrakey': '1', 'stn_cls': 'FB'}}}
        with self.assertRaises(ValueError):
            package({'issue': 3076, 'scope': 'test', 'records': [row, row]}, 'hash', '2026-11-08')


if __name__ == '__main__':
    unittest.main()