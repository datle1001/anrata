import tempfile
import unittest
from pathlib import Path
from summarize_p1546_validation import summarize
from calculate_terrestrial_example import octave_quote


class ValidationTests(unittest.TestCase):
    def test_deviation_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'results.csv'
            path.write_text('Filename,Deviation: Predicted-Reference\nexample.csv,0.01\n')
            with self.assertRaises(ValueError):
                summarize(path)

    def test_zero_agreement_counted(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'results.csv'
            path.write_text('Filename,Deviation: Predicted-Reference\nexample.csv,0\n')
            result = summarize(path)
            self.assertEqual(result['referenceCaseCount'], 1)
            self.assertEqual(result['maximumAbsoluteReportedDeviationDb'], 0)

    def test_quote_external_path(self):
        self.assertEqual(octave_quote("/tmp/a'b"), "'/tmp/a''b'")