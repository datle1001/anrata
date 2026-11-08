"""Offline notice-linked P.1546-6 conditional predictions using a pinned external model.

Never infer ERP, terrain, effective height, channel spacing or criterion applicability
from raw MDB numbers. A reviewed manifest supplies them explicitly. Missing or
out-of-domain paths stay unresolved. This runner never certifies safety or compliance.
"""
import argparse
import copy
import hashlib
import json
import math
from pathlib import Path
import shlex
import subprocess
import tempfile

from calculate_terrestrial_example import octave_quote
from terrestrial_criteria import coordination_criterion

COMMIT = '0e4263999ce055100f42257c2aafbac96ac630af'
ENTRY_HASH = 'a327182423a061571345db976e841488de77dfd1ee91826c855e2b908a18da3b'
TREE_HASH = '07ef52e76ef46ee1e53a9afdc4a7fd9d40d64b1b1c859dc3ae05bd6ee595fd4d'
LIMITATIONS = [
    'Conditional predictions at supplied sample points, not verified actual paths or a geographic maximum.',
    'External model omits Annex 7 climate adjustment and Annex 5 section 4.3(a) terrain correction.',
    'Bundled reference agreement is not independent validation or validation of Finnish cases.',
    'Coordination triggers are separate from harmful-interference or compliance findings.',
]


def sha(data):
    return hashlib.sha256(data).hexdigest()


def tree_hash(model):
    files = sorted(model.rglob('*.m'))
    if not files or sha((model / 'P1546FieldStrMixed.m').read_bytes()) != ENTRY_HASH:
        raise ValueError('External model entry point does not match the pinned P.1546 version')
    # Cover all executable model helpers, not just the public entry point.
    digest = sha('\n'.join(f'{p.relative_to(model).as_posix()}:{sha(p.read_bytes())}' for p in files).encode())
    if digest != TREE_HASH:
        raise ValueError('External model helpers do not match the pinned executable tree')
    return digest


def number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def path_blockers(p):
    blockers = []
    bounds = {'frequencyMHz': (30, 4000), 'timePercentage': (1, 50),
              'effectiveHeightM': (3, 2999), 'receiverHeightM': (1, 3000),
              'receiverClutterHeightM': (0, 3000), 'erpKw': (1e-12, 1e9)}
    for key, (low, high) in bounds.items():
        if not number(p.get(key)) or not low <= p[key] <= high:
            blockers.append(f'{key}: missing or outside conservative runner domain [{low}, {high}]')
    if p.get('receiverEnvironment') not in ('Rural', 'Suburban', 'Urban', 'Dense Urban', 'Sea'):
        blockers.append('Receiver environment must be explicitly selected')
    if p.get('locationPercentage') != 50:
        blockers.append('This reviewed runner supports 50% locations only')
    if not p.get('evidenceReference') or not isinstance(p.get('assumptions'), list) or not p['assumptions']:
        blockers.append('Explicit evidence reference and conditional assumptions required')
    sections = p.get('sections', [])
    if not isinstance(sections, list) or not sections or any(
        not isinstance(s, dict) or not number(s.get('distanceKm')) or s['distanceKm'] <= 0
        or s.get('zone') not in ('Land', 'Cold', 'Warm') for s in sections
    ):
        blockers.append('Ordered positive land/cold-sea/warm-sea sections required')
        return blockers, None
    distance = sum(s['distanceKm'] for s in sections)
    if not 1 <= distance <= 1000:
        blockers.append('Distance outside P.1546 1–1000 km; no extrapolation')
    if distance < 15 and (not number(p.get('transmitterHeightAglM')) or p['transmitterHeightAglM'] <= 1):
        blockers.append('Short path requires explicit transmitter height AGL, not an effective-height substitution')
    return blockers, distance


def predict(p, model, command):
    sections = p['sections']
    lengths = '[' + ','.join(str(s['distanceKm']) for s in sections) + ']'
    zones = '{' + ','.join(octave_quote(s['zone']) for s in sections) + '}'
    optional = f",'q',50,'PTx',{p['erpKw']}"
    if number(p.get('transmitterHeightAglM')):
        optional += f",'ha',{p['transmitterHeightAglM']}"
    with tempfile.TemporaryDirectory(prefix='antara-p1546-') as folder:
        folder = Path(folder)
        output = folder / 'prediction.csv'
        script = folder / 'predict.m'
        script.write_text(
            f"addpath({octave_quote(model)});\n"
            f"[E,L]=P1546FieldStrMixed({p['frequencyMHz']},{p['timePercentage']},"
            f"{p['effectiveHeightM']},{p['receiverHeightM']},{p['receiverClutterHeightM']},"
            f"{octave_quote(p['receiverEnvironment'])},{lengths},{zones},0{optional});\n"
            f"fid=fopen({octave_quote(output)},'w');fprintf(fid,'%.12f,%.12f\\n',E,L);fclose(fid);\n"
        )
        run = subprocess.run([*shlex.split(command), '--no-gui', '--quiet', str(script)],
                             capture_output=True, text=True, timeout=120, check=True)
        field, loss = map(float, output.read_text().strip().split(','))
        if not all(math.isfinite(v) for v in (field, loss)):
            raise ValueError('Non-finite P.1546 result')
        return field, loss, run.stderr.strip()


def compare(field, p):
    unresolved = {'status': 'unresolved', 'thresholdDbUvPerM': None, 'marginDb': None,
                  'source': None, 'reason': 'Criterion applicability and matching spectral basis unconfirmed'}
    c = p.get('coordination')
    if field is None or not isinstance(c, dict):
        return unresolved
    try:
        if c.get('applicabilityConfirmed') is not True or c.get('spectrumBasisConfirmed') is not True or not c.get('evidenceReference'):
            return unresolved
        criterion = coordination_criterion(c.get('lowerMHz'), c.get('upperMHz'),
            applicability_confirmed=True,
            challenge_extension_confirmed=c.get('challengeExtensionConfirmed') is True,
            channel_spacing_khz=c.get('channelSpacingKhz'),
            uniform_spectrum_confirmed=c.get('uniformSpectrumConfirmed') is True)
        if p.get('powerReferenceBandwidthHz') != criterion['referenceBandwidthHz']:
            unresolved['reason'] = 'ERP spectral bandwidth does not match criterion reference bandwidth'
            return unresolved
        if (p['timePercentage'], p['locationPercentage'], p['receiverHeightM']) != (10, 50, 10):
            unresolved['reason'] = 'Time/location/receiver height does not match selected criterion'
            return unresolved
        if not c['lowerMHz'] <= p['frequencyMHz'] <= c['upperMHz']:
            unresolved['reason'] = 'Prediction frequency outside selected criterion interval'
            return unresolved
        if c.get('evaluationLocationConfirmed') is not True:
            unresolved['reason'] = 'Criterion evaluation location unconfirmed'
            return unresolved
        margin = field - criterion['criterionDbUvPerM']
        return {'status': 'conditional-above-trigger' if margin > 0 else 'conditional-at-or-below-trigger',
                'thresholdDbUvPerM': criterion['criterionDbUvPerM'], 'marginDb': margin,
                'source': criterion['source'], 'criterion': criterion,
                'reason': 'Conditional sample-point coordination trigger comparison only; not clearance or proof of interference'}
    except (ValueError, TypeError, KeyError) as error:
        unresolved['reason'] = str(error)
        return unresolved


def enrich(publication, manifest, model, command='octave', predictor=predict):
    result = copy.deepcopy(publication)
    model_hash = tree_hash(model)
    source_hash = sha(json.dumps(publication, sort_keys=True, ensure_ascii=False, separators=(',', ':')).encode())
    manifest_hash = sha(json.dumps(manifest, sort_keys=True, ensure_ascii=False, separators=(',', ':')).encode())
    records = result['records']
    identities = [r['notice']['raw']['terrakey'] for r in records]
    if len(set(identities)) != len(identities):
        raise ValueError('Duplicate notice identities')
    if any(key not in identities for key in manifest.get('notices', {})):
        raise ValueError('Manifest refers to a notice absent from the source')
    for row in records:
        notice_id = row['notice']['raw']['terrakey']
        paths = manifest.get('notices', {}).get(notice_id)
        if not paths:
            continue  # Unprepared evidence stays unchanged, not silently populated.
        if not isinstance(paths, list) or len(paths) > 500:
            raise ValueError('Require 1–500 paths per prepared notice')
        source_record = {k: v for k, v in row.items() if k != 'p1546'}
        assessment = {'schemaVersion': 'antara-p1546-v1', 'noticeId': notice_id,
            'scope': 'Stored offline conditional P.1546-6 sample predictions; actual-path and regulatory validation not established',
            'sourceRecord': copy.deepcopy(source_record),
            'provenance': {'sourceSha256': source_hash, 'manifestSha256': manifest_hash,
                'scriptSha256': sha(Path(__file__).read_bytes()), 'modelTreeSha256': model_hash,
                'modelCommit': COMMIT, 'modelRepository': 'https://github.com/eeveetza/p1546',
                'validationScope': 'External bundled reference agreement only; not independent Finnish-path validation'},
            'limitations': LIMITATIONS, 'paths': []}
        ids = set()
        for p in paths:
            if not isinstance(p, dict) or not p.get('id') or not p.get('target') or p['id'] in ids:
                raise ValueError('Every path needs a unique id and named target')
            ids.add(p['id'])
            blockers, distance = path_blockers(p)
            field = loss = None
            warnings = ''
            if not blockers:
                try:
                    field, loss, warnings = predictor(p, model, command)
                except (subprocess.SubprocessError, ValueError, OSError) as error:
                    blockers.append(f'Model execution unresolved: {error}')
            assessment['paths'].append({'id': p['id'], 'target': p['target'],
                'status': 'unresolved' if blockers else 'conditional', 'distanceKm': distance,
                'fieldStrengthDbUvPerM': field, 'basicTransmissionLossDb': loss,
                'inputs': copy.deepcopy(p), 'assumptions': p.get('assumptions', []),
                'blockers': blockers, 'executionWarnings': warnings, 'comparison': compare(field, p)})
        row['p1546'] = assessment
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('publication', type=Path)
    parser.add_argument('manifest', type=Path)
    parser.add_argument('model_directory', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--octave-command', default='octave')
    args = parser.parse_args()
    source = json.loads(args.publication.read_text())
    manifest = json.loads(args.manifest.read_text())
    enriched = enrich(source, manifest, args.model_directory.resolve(), args.octave_command)
    args.output.write_text(json.dumps(enriched, ensure_ascii=False, indent=2, allow_nan=False) + '\n')