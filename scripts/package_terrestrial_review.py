"""Package already-screened terrestrial evidence for Cloud inbox; never calculate propagation."""
import argparse
import hashlib
import json
from pathlib import Path


def package(artifact, source_sha256, published_at, synthetic=False):
    rows = artifact['records']
    if not rows:
        raise ValueError('No records supplied')
    if len({r['notice']['raw']['terrakey'] for r in rows}) != len(rows):
        raise ValueError('Duplicate terrestrial identities; resolve source ambiguity first')
    if any(r['notice']['raw']['stn_cls'] not in ('FB', 'ML') for r in rows):
        raise ValueError('Only land-mobile FB / ML notices are supported')
    return {
        'schemaVersion': 'antara-terrestrial-review-v1',
        'service': 'Terrestrial Services', 'synthetic': synthetic,
        'issue': artifact['issue'], 'publishedAt': published_at,
        'totalNotices': len(rows), 'records': rows,
        'scope': artifact['scope'], 'sourceSha256': source_sha256,
        'preparationScope': 'Packaging only. Existing screening, source rows and arbitrary values unchanged; no P.1546, spectrum conversion or regulatory recalculation.',
        'sourceMetadata': {k: v for k, v in artifact.items() if k != 'records'},
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--published-at', required=True)
    parser.add_argument('--synthetic', action='store_true')
    args = parser.parse_args()
    raw = args.input.read_bytes()
    result = package(json.loads(raw), hashlib.sha256(raw).hexdigest(), args.published_at, args.synthetic)
    if result['totalNotices'] > 500:
        raise ValueError('Inbox currently accepts at most 500 notices per issue; retain full artifact offline, do not silently truncate.')
    output = json.dumps(result, ensure_ascii=False, indent=2).encode()
    if len(output) > 2 * 1024 * 1024:
        raise ValueError('Inbox currently accepts at most 2 MB; retain full evidence offline, do not discard fields.')
    args.output.write_bytes(output)


if __name__ == '__main__':
    main()