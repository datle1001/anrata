"""Run external P.1546 reference software for conditional path sensitivity cases.

Source is not vendored. Pass a pinned external MATLAB model directory and Octave.
No coordination comparison or actual mixed-path prediction is produced.
"""
import argparse
import csv
import hashlib
import json
import math
from pathlib import Path
import shlex
import subprocess
import tempfile


def octave_quote(value):
    return "'" + str(value).replace("'", "''") + "'"


def run(preparation, model_dir, command):
    inputs = preparation['proposedModelInputs']
    result = dict(preparation)
    result['scope'] = 'Conditional P.1546 sensitivity experiment; not actual mixed-path prediction, validated worst-case bound or coordination verdict'
    result['model'] = {
        'repository': 'https://github.com/eeveetza/p1546',
        'expectedCommit': '0e4263999ce055100f42257c2aafbac96ac630af',
        'entryPointSha256': hashlib.sha256((model_dir / 'P1546FieldStrMixed.m').read_bytes()).hexdigest(),
        'credit': 'Jef Statham; Ivica Stevanovic. External implementation, custom license; not vendored.',
        'limitations': ['Annex 7 climatic adjustments not implemented', 'Annex 5 section 4.3(a) C_h1 not implemented', 'Some input-domain checks are disabled in the external software'],
    }
    result['paths'] = []
    with tempfile.TemporaryDirectory(prefix='p1546-case-') as work:
        work = Path(work)
        for path in preparation['paths']:
            calculated = dict(path)
            calculated['sensitivityScenarios'] = []
            if not path['withinP1546DistanceDomain']:
                result['paths'].append(calculated)
                continue
            output = work / 'result.csv'
            statements = [f"addpath({octave_quote(model_dir)});", f"fid=fopen({octave_quote(output)},'w');"]
            for zone in ('Land', 'Cold'):
                statements.append(
                    f"[E,L]=P1546FieldStrMixed({inputs['frequencyMHz']},{inputs['timePercentage']},"
                    f"{inputs['effectiveHeightMConditional']},{inputs['receiverHeightM']},10,'Rural',"
                    f"{path['distanceKm']},{octave_quote(zone)},0,'q',50,'PTx',{inputs['erpKwConditional']});"
                    f"fprintf(fid,'{zone},%.12f,%.12f\\n',E,L);"
                )
            statements.append('fclose(fid);')
            script = work / 'run_case.m'
            script.write_text('\n'.join(statements))
            completed = subprocess.run([*shlex.split(command), '--no-gui', '--quiet', str(script)], capture_output=True, text=True, check=True)
            for zone, field, loss in csv.reader(output.read_text().splitlines()):
                if not all(math.isfinite(float(v)) for v in (field, loss)):
                    raise ValueError('Non-finite propagation result')
                calculated['sensitivityScenarios'].append({
                    'pathZone': zone, 'receiverEnvironment': 'Rural', 'receiverClutterHeightM': 10,
                    'terrainProfileAvailable': False, 'fieldStrengthDbUvPerMTotalChannelConditional': float(field),
                    'basicTransmissionLossDb': float(loss), 'coordinationMarginDb': None,
                    'scope': 'Homogeneous-path sensitivity only; actual land/sea fractions and directional ERP unknown',
                })
            calculated['executionWarnings'] = completed.stderr.strip()
            calculated['status'] = 'Conditional sensitivity calculated; actual path and criterion comparison unresolved'
            result['paths'].append(calculated)
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('preparation', type=Path)
    parser.add_argument('model_directory', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--octave-command', default='octave')
    args = parser.parse_args()
    result = run(json.loads(args.preparation.read_text()), args.model_directory.resolve(), args.octave_command)
    result['preparationSha256'] = hashlib.sha256(args.preparation.read_bytes()).hexdigest()
    args.output.write_text(json.dumps(result, indent=2) + '\n')