"""Check external bundled-reference CSV agreement; not independent validation."""
import argparse
import csv
import hashlib
import json
import math
from pathlib import Path


def summarize(path):
    with path.open() as handle:
        rows = list(csv.DictReader(handle))
    deviations = [abs(float(row['Deviation: Predicted-Reference'])) for row in rows]
    if not deviations or not all(math.isfinite(v) for v in deviations):
        raise ValueError('Missing or non-finite reference deviations')
    maximum = max(deviations)
    if maximum > 1e-7:
        raise ValueError(f'Reference agreement exceeds 1e-7 dB tolerance: {maximum}')
    return {'referenceCaseCount': len(rows), 'profileFileCount': len({row['Filename'] for row in rows}),
        'maximumAbsoluteReportedDeviationDb': maximum, 'toleranceDb': 1e-7,
        'scope': 'Agreement with external implementation bundled references at eight-decimal CSV precision; not independent validation or Finnish-case validation',
        'repository': 'https://github.com/eeveetza/p1546', 'commit': '0e4263999ce055100f42257c2aafbac96ac630af',
        'runtime': 'GNU Octave 11.1.0', 'sourceCsvSha256': hashlib.sha256(path.read_bytes()).hexdigest()}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('csv', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    args.output.write_text(json.dumps(summarize(args.csv), indent=2) + '\n')