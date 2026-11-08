"""Build review-only queues and separate CSVs from existing offline artifacts.

No RF recalculation, clearance, band-based ranking or inferred withdrawal.
"""
import argparse
import csv
import hashlib
import json
from collections import defaultdict
from pathlib import Path


def space_rows(candidates, audit, triage):
    groups = {(g['noticeId'], g['groupId']): g for g in audit['groups']}
    classes = {(g['noticeId'], g['groupId']): g for g in triage['groups']}
    notices = defaultdict(list)
    for row in candidates['candidates']:
        notices[row['noticeId']].append(row)
    output = []
    for notice_id, rows in sorted(notices.items()):
        keys = sorted({(r['noticeId'], r['groupId']) for r in rows})
        evidence = [groups[k] for k in keys if k in groups]
        raw_classes = sorted({classes.get(k, {}).get('classification', 'unresolved') for k in keys})
        first = rows[0]
        output.append({
            'id': notice_id, 'issue': 3074, 'kind': 'space',
            'name': next((g['networkName'] for g in evidence if g.get('networkName')), notice_id),
            'administration': first['administration'],
            'lowerMHz': min(r['lowerMHz'] for r in rows), 'upperMHz': max(r['upperMHz'] for r in rows),
            'intervalScope': 'Envelope for display only; disjoint intervals retained in source artifact',
            'frequencyRows': len(rows), 'groupCount': len(keys),
            'matchedRows': sorted({m['sourceRow'] for r in rows for m in r['matchedFinnishRows']}),
            'status': 'Frequency overlap; technical review unresolved', 'classifications': raw_classes,
            'actionRaw': first['noticeProvision'],
            'source': first['source'], 'groupIds': [k[1] for k in keys],
            'blockers': ['M4/provision applicability per group', 'Orbit and reception-area coverage',
                         'Power semantics and aggregation', 'Validated PFD and matching reference units'],
            'calculationScope': 'No filing-wide PFD or regulatory conclusion',
        })
    return output


def terrestrial_rows(artifact):
    output = []
    for record in artifact['records']:
        notice, raw = record['notice'], record['notice']['raw']
        def numeric(key):
            try:
                value = float(raw.get(key, ''))
                return value if value == value and abs(value) != float('inf') else None
            except (ValueError, TypeError):
                return None
        output.append({'id': raw['terrakey'], 'issue': artifact['issue'], 'kind': 'terrestrial',
                       'name': raw['assgn_id'], 'administration': raw['adm'],
                       'lowerMHz': numeric('freq_min'), 'upperMHz': numeric('freq_max'),
                       'frequencyRows': 1, 'groupCount': 1,
                       'matchedRows': sorted({m['source']['row'] for m in record['matchedFinnishRows']}),
                       'status': record['screenStatus'], 'classifications': [raw['stn_cls']],
                       'actionRaw': notice['notificationActionRaw'], 'amendTypeRaw': raw.get('amend_type'),
                       'withdrawalEvidenceRaw': notice['withdrawalEvidenceRaw'],
                       'source': notice['source'], 'groupIds': [],
                       'blockers': record['blockers'], 'calculationScope': 'No actual-path field strength or coordination verdict',
                       'transmitterPointCount': sum(bool(l['reportedPoint']) for l in record['transmitterLocations'])})
    return output


def trend_rows(summary):
    previous, current = summary['issues']
    result = []
    for adm in ('RUS', 'EST', 'S', 'NOR'):
        a = previous['landMobileAdministrations'].get(adm, 0)
        b = current['landMobileAdministrations'].get(adm, 0)
        result.append({'administration': adm, 'previousIssue': previous['issue'], 'currentIssue': current['issue'],
                       'previousPublicationRows': a, 'currentPublicationRows': b, 'difference': b-a,
                       'scope': 'Two publication snapshots, not assignment growth, withdrawal or interference trend'})
    return result


def write_outputs(rows, folder, issue):
    path = folder / f'ific{issue}-review-results.csv'
    fields = ['issue', 'id', 'name', 'administration', 'lowerMHz', 'upperMHz', 'frequencyRows', 'groupCount',
              'matchedRows', 'status', 'classifications', 'actionRaw', 'source', 'blockers', 'calculationScope']
    with path.open('w', newline='', encoding='utf-8-sig') as stream:
        writer = csv.DictWriter(stream, fieldnames=fields, extrasaction='ignore')
        writer.writeheader()
        for row in rows:
            writer.writerow({key: json.dumps(value, ensure_ascii=False) if isinstance(value, (list, dict)) else value
                             for key, value in row.items()})
    return path


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ('candidates', 'audit', 'triage', 'terrestrial', 'comparison', 'output'):
        parser.add_argument(name, type=Path)
    args = parser.parse_args()
    inputs = {name: json.loads(getattr(args, name).read_text()) for name in ('candidates', 'audit', 'triage', 'terrestrial', 'comparison')}
    space = space_rows(inputs['candidates'], inputs['audit'], inputs['triage'])
    terra = terrestrial_rows(inputs['terrestrial'])
    args.output.mkdir(parents=True, exist_ok=True)
    artifact = {'scope': 'Offline review queue only; no clearance or completed interference assessment',
                'sourceSha256': {name: hashlib.sha256(getattr(args, name).read_bytes()).hexdigest() for name in inputs},
                'rows': space+terra, 'trends': trend_rows(inputs['comparison'])}
    (args.output/'review-queue.json').write_text(json.dumps(artifact, ensure_ascii=False, separators=(',', ':'))+'\n')
    for rows, issue in ((space,3074),(terra,3076)):
        write_outputs(rows,args.output,issue)
    print(json.dumps({'spaceNotices':len(space),'terrestrialRows':len(terra)}))