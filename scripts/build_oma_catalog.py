"""Build compact searchable evidence catalog; NOT propagation or compliance analysis.
Inputs: immutable candidate and terrestrial screening artifacts downloaded to CLI paths.
"""
import argparse, hashlib, json
from pathlib import Path

def build(space_path, terrestrial_path):
    space = json.loads(Path(space_path).read_text())
    terrestrial = json.loads(Path(terrestrial_path).read_text())
    intervals = {}
    for r in space['candidates']:
        key = (r['noticeId'], r['lowerMHz'], r['upperMHz'])
        intervals[key] = {'filingId': r['noticeId'], 'lowerMHz': r['lowerMHz'], 'upperMHz': r['upperMHz'], 'source': r['source']}
    return {'scope': 'Space: only 131 previously identified Excel-overlap notices and their candidate frequency rows; NOT all IFIC frequencies. What-if counts are interval overlap only, not interference, PFD or regulatory re-evaluation.',
            'hashes': {Path(p).name: hashlib.sha256(Path(p).read_bytes()).hexdigest() for p in [space_path, terrestrial_path]},
            'spaceIntervals': list(intervals.values()), 'terrestrialScope': terrestrial['scope'],
            'terrestrial': terrestrial['records']}

if __name__ == '__main__':
    p = argparse.ArgumentParser(); p.add_argument('--space', required=True); p.add_argument('--terrestrial', required=True); p.add_argument('--output', required=True)
    a = p.parse_args(); Path(a.output).write_text(json.dumps(build(a.space, a.terrestrial), separators=(',', ':')))