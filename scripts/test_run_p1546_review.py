import copy
import unittest
from pathlib import Path
from unittest.mock import patch
from run_p1546_review import path_blockers, compare, enrich, TREE_HASH


def inputs():
    return {'id': 'border-1', 'target': 'Explicit sample', 'frequencyMHz': 150,
        'timePercentage': 10, 'locationPercentage': 50, 'effectiveHeightM': 60,
        'receiverHeightM': 10, 'receiverClutterHeightM': 10, 'erpKw': 0.1,
        'receiverEnvironment': 'Rural', 'sections': [{'distanceKm': 100, 'zone': 'Land'}],
        'assumptions': ['Conditional test inputs, not a real border path'], 'evidenceReference': 'test',
        'powerReferenceBandwidthHz': 25000,
        'coordination': {'lowerMHz': 149.9, 'upperMHz': 150.1,
            'applicabilityConfirmed': True, 'spectrumBasisConfirmed': True,
            'evaluationLocationConfirmed': True, 'evidenceReference': 'test'}}


class P1546ReviewTests(unittest.TestCase):
    def test_missing_erp_never_inferred_from_raw_power(self):
        p = inputs(); del p['erpKw']; p['pwr_dbw'] = 20
        self.assertTrue(any('erpKw' in b for b in path_blockers(p)[0]))

    def test_distance_1001_not_extrapolated(self):
        p = inputs(); p['sections'][0]['distanceKm'] = 1001
        self.assertTrue(any('no extrapolation' in b for b in path_blockers(p)[0]))

    def test_mixed_sections_retained(self):
        p = inputs(); p['sections'] = [{'distanceKm': 40, 'zone': 'Land'}, {'distanceKm': 60, 'zone': 'Cold'}]
        self.assertEqual(path_blockers(p), ([], 100))

    def test_short_path_needs_agl(self):
        p = inputs(); p['sections'][0]['distanceKm'] = 5
        self.assertTrue(any('Short path' in b for b in path_blockers(p)[0]))

    def test_applicability_gate_precedes_numeric_comparison(self):
        p = inputs(); p['coordination']['applicabilityConfirmed'] = False
        self.assertIsNone(compare(99, p)['marginDb'])

    def test_150_mhz_criterion_is_12_not_universal_20(self):
        c = compare(15, inputs())
        self.assertEqual(c['thresholdDbUvPerM'], 12)
        self.assertEqual(c['marginDb'], 3)
        self.assertEqual(c['status'], 'conditional-above-trigger')

    def test_below_trigger_not_clearance(self):
        self.assertEqual(compare(10, inputs())['status'], 'conditional-at-or-below-trigger')

    def test_spectral_basis_mismatch_unresolved(self):
        p = inputs(); p['powerReferenceBandwidthHz'] = 5000000
        self.assertIsNone(compare(15, p)['marginDb'])

    def test_time_mismatch_unresolved(self):
        p = inputs(); p['timePercentage'] = 1
        self.assertIsNone(compare(15, p)['marginDb'])

    def test_unprepared_record_preserved_and_unresolved_never_executed(self):
        publication = {'records': [{'notice': {'raw': {'terrakey': 'A'}}, 'arbitrary': {'x': 1}}, {'notice': {'raw': {'terrakey': 'B'}}}]}
        original = copy.deepcopy(publication)
        p = inputs(); p['erpKw'] = None
        def forbidden(*args):
            self.fail('Unresolved input reached external model')
        with patch('run_p1546_review.tree_hash', return_value=TREE_HASH):
            result = enrich(publication, {'notices': {'A': [p]}}, Path('/unused'), predictor=forbidden)
        self.assertEqual(publication, original)
        self.assertEqual(result['records'][1], original['records'][1])
        artifact = result['records'][0]['p1546']
        self.assertEqual(artifact['sourceRecord'], original['records'][0])
        self.assertEqual(artifact['paths'][0]['status'], 'unresolved')
        self.assertIsNone(artifact['paths'][0]['fieldStrengthDbUvPerM'])


if __name__ == '__main__':
    unittest.main()