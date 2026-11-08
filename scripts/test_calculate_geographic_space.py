import unittest
from calculate_geographic_space import calculate


class GeographicSpaceTests(unittest.TestCase):
    def test_sample_maximum_keeps_regulatory_comparison_unresolved(self):
        example={'issue':3074,'noticeId':'1','groupId':'2','networkName':'Test',
                 'sourceEvidence':{'geo':[{'raw':{'long_nom':'66'}}], 's_beam':[{'raw':{'gain':'30'}}],
                                   'emiss':[{'csvRow':2,'raw':{'pwr_ds_max':'-40'}}]},
                 'assumptions':[],'validation':'analytic','blockers':[]}
        points={'points':{'nationalGrid':[[25,60],[25,65]]},'qualifications':[],'sources':[]}
        result=calculate(example,points)['results'][0]
        self.assertEqual(result['sampleCount'],2)
        self.assertEqual(result['visibleCount'],2)
        self.assertIsNone(result['limitDbwM2'])
        self.assertIsNone(result['marginDb'])
        self.assertIn(result['maximumPointLonLat'],[[25,60],[25,65]])


if __name__=='__main__':
    unittest.main()