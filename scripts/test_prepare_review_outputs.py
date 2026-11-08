import unittest
from prepare_review_outputs import trend_rows, terrestrial_rows, space_rows


class ReviewOutputTests(unittest.TestCase):
    def test_missing_network_name_uses_notice_id(self):
        candidate={'noticeId':'1','groupId':'2','administration':'USA','lowerMHz':3400,'upperMHz':3500,
                   'matchedFinnishRows':[],'noticeProvision':'11.2','source':{'csvRow':2}}
        rows=space_rows({'candidates':[candidate]},{'groups':[{'noticeId':'1','groupId':'2','networkName':None}]},{'groups':[]})
        self.assertEqual(rows[0]['name'],'1')

    def test_absence_does_not_become_withdrawal(self):
        summary = {'issues': [{'issue':3075,'landMobileAdministrations':{'EST':24}},
                              {'issue':3076,'landMobileAdministrations':{}}]}
        result = next(r for r in trend_rows(summary) if r['administration']=='EST')
        self.assertEqual(result['difference'],-24)
        self.assertNotIn('withdrawn',result)
        self.assertEqual(result['currentPublicationRows'],0)

    def test_no_overlap_retained_unresolved(self):
        raw = {'terrakey':'1','assgn_id':'2','adm':'POL','freq_min':'801','freq_max':'806','stn_cls':'FB'}
        notice = {'raw':raw,'notificationActionRaw':'ADD','withdrawalEvidenceRaw':False,'source':{'csvRow':2}}
        rows = terrestrial_rows({'issue':3076,'records':[{'notice':notice,'matchedFinnishRows':[],
            'screenStatus':'No Excel overlap; national/adjacent-band relevance unresolved',
            'blockers':['M4'],'transmitterLocations':[]}]})
        self.assertEqual(len(rows),1)
        self.assertEqual(rows[0]['matchedRows'],[])
        self.assertEqual(rows[0]['lowerMHz'],801)
        self.assertIn('unresolved',rows[0]['status'])


if __name__ == '__main__':
    unittest.main()