"""Normalize an official M4 API snapshot and compare retained source intervals offline.

No service applicability, propagation, adjacent-band assessment or safety verdict.
Usage: prepare_m4_evidence.py RAW_API SPACE_CANDIDATES TERRA_SCREENING OUTPUT
"""
import hashlib
import json
import math
import sys
from pathlib import Path

URL = 'https://opendata.traficom.fi/api/v13/Taajuusjakotaulukko'


def normalize(value):
    if not isinstance(value, dict) or not isinstance(value.get('value'), list):
        raise ValueError('Expected M4 OData value array')
    records = []
    for position, raw in enumerate(value['value'], 1):
        lo, hi = raw.get('Sub_band_lower_limit__Hz_'), raw.get('Sub_band_upper_limit__Hz_')
        valid = all(isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v) and v > 0 for v in (lo, hi)) and lo < hi
        records.append({'id': raw.get('ID'), 'sourcePosition': position, 'raw': raw,
                        'lowerMHz': lo / 1e6 if valid else None, 'upperMHz': hi / 1e6 if valid else None,
                        'status': 'Allocation interval only' if valid else 'Unresolved numeric sub-band limits'})
    return records


def match_interval(lo, hi, allocations):
    if not all(isinstance(v, (int, float)) and math.isfinite(v) for v in (lo, hi)) or lo <= 0 or hi < lo:
        return None
    return [r['id'] for r in allocations if r['lowerMHz'] is not None and lo <= r['upperMHz'] and hi >= r['lowerMHz']]


def build(raw, space, terrestrial):
    allocations = normalize(raw)
    space_matches = [{'noticeId': row['noticeId'], 'groupId': row['groupId'], 'source': row['source'],
                     'lowerMHz': row['lowerMHz'], 'upperMHz': row['upperMHz'],
                     'm4Ids': match_interval(row['lowerMHz'], row['upperMHz'], allocations)} for row in space['candidates']]
    terra_matches = []
    for row in terrestrial['records']:
        notice = row['notice']
        try:
            lo, hi = float(notice['raw']['freq_min']), float(notice['raw']['freq_max'])
        except (ValueError, TypeError):
            lo, hi = None, None
        terra_matches.append({'terrakey': notice['raw']['terrakey'], 'source': notice['source'],
                              'lowerMHz': lo, 'upperMHz': hi, 'm4Ids': match_interval(lo, hi, allocations),
                              'excelMatchCount': len(row['matchedFinnishRows'])})
    return {'version': 1, 'sourceUrl': URL, 'odataContext': raw.get('@odata.context'),
            'scope': 'Official M4 sub-band interval overlap only, not regulatory service applicability or interference assessment. Space input is the retained Excel-overlap pool, not the entire IFIC; all retained terrestrial rows are assessed for interval overlap.',
            'metrics': {'m4Rows': len(allocations), 'm4UnresolvedRows': sum(r['lowerMHz'] is None for r in allocations),
                        'spaceFrequencyRows': len(space_matches), 'spaceMatchedRows': sum(bool(r['m4Ids']) for r in space_matches),
                        'terrestrialRows': len(terra_matches), 'terrestrialMatchedRows': sum(bool(r['m4Ids']) for r in terra_matches),
                        'terrestrialM4MatchesWithoutExcel': sum(bool(r['m4Ids']) and not r['excelMatchCount'] for r in terra_matches)},
            'allocations': allocations, 'spaceMatches': space_matches, 'terrestrialMatches': terra_matches,
            'qualifications': ['M4 allocation overlap alone does not confirm protected service or applicable limits.',
                               'No Excel match never excludes M4 or licence-exempt reception.',
                               'API timestamps are retrieval metadata, not independently verified legal effective dates.',
                               'Power fields are retained raw; their units and applicability are not inferred.']}


if __name__ == '__main__':
    inputs = [Path(p) for p in sys.argv[1:4]]
    result = build(*[json.loads(p.read_text()) for p in inputs])
    result['inputSha256'] = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in inputs}
    result['scriptSha256'] = hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
    Path(sys.argv[4]).write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':')) + '\n')
    print(json.dumps(result['metrics']))