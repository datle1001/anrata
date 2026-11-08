"""Prepare an auditable P.1546 experiment; no propagation model is implemented here."""
import argparse
import hashlib
import json
import math
from pathlib import Path


def distance_and_bearing(lat1, lon1, lat2, lon2):
    if not all(math.isfinite(v) for v in (lat1, lon1, lat2, lon2)):
        raise ValueError("Coordinates must be finite")
    if not (-90 <= lat1 <= 90 and -90 <= lat2 <= 90 and -180 <= lon1 <= 180 and -180 <= lon2 <= 180):
        raise ValueError("Coordinates out of range")
    p1, p2 = map(math.radians, (lat1, lat2))
    dl = math.radians(lon2 - lon1)
    a = math.sin((p2-p1)/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    distance = 6371.0088 * 2 * math.asin(math.sqrt(min(1, max(0, a))))
    bearing = math.degrees(math.atan2(math.sin(dl)*math.cos(p2), math.cos(p1)*math.sin(p2)-math.sin(p1)*math.cos(p2)*math.cos(dl))) % 360
    return distance, bearing


def erp_kw(dbw):
    if not math.isfinite(dbw):
        raise ValueError("Power must be finite")
    return 10 ** ((dbw - 30) / 10)


def prepare(screening, finland):
    case = screening['example']
    location = case['transmitterLocations'][0]
    point = location['reportedPoint']
    antenna = location['antennaEvidence'][0]['raw']
    paths = []
    for matched in case['matchedFinnishRows']:
        candidates = [r for r in finland['records'] if r['station'] == matched['station']]
        if matched.get('source'):
            candidates = [r for r in candidates if r['source'] == matched['source']]
        if len(candidates) != 1:
            raise ValueError('Matched Finnish source row missing or ambiguous; station number alone is not unique')
        row = candidates[0]
        lat, lon = float(row['raw']['Latitude']), float(row['raw']['Longitude'])
        distance, bearing = distance_and_bearing(point['latitudeDeg'], point['longitudeDeg'], lat, lon)
        paths.append({
            'station': row['station'], 'source': row['source'], 'receiverRaw': row['raw'],
            'distanceKm': distance, 'initialBearingDeg': bearing,
            'geometryMethod': 'Spherical great circle, mean Earth radius 6371.0088 km; not a terrain profile',
            'withinP1546DistanceDomain': 1 <= distance <= 1000,
            'fieldStrengthDbUvPerM': None, 'coordinationMarginDb': None,
            'status': 'Prepared; propagation not run' if 1 <= distance <= 1000 else 'Outside 1–1000 km P.1546 distance domain; do not extrapolate',
        })
    return {
        'issue': screening['issue'], 'noticeEvidence': case['notice'],
        'transmitterEvidence': location,
        'scope': 'Conditional experiment inputs only; no field strength or coordination verdict',
        'proposedModelInputs': {
            'frequencyMHz': float(case['notice']['raw']['freq_assgn']),
            'timePercentage': 10, 'locationPercentage': 50, 'receiverHeightM': 10,
            'erpKwConditional': erp_kw(float(antenna['pwr_dbw'])),
            'effectiveHeightMConditional': float(antenna['eff_hgtmax']),
            'powerInterpretation': 'ASSUMPTION: pwr_dbw is total-channel ERP in dBW; pwr_eiv=E not independently verified. No antenna gain added.',
            'heightInterpretation': 'ASSUMPTION: eff_hgtmax is usable effective height in metres; use maximum, not verified directional height.',
        },
        'paths': paths,
        'assumptions': [
            'Reported point coordinates used as decimal degrees; datum unverified.',
            'Maximum effective height and total ERP are conditional sensitivity inputs, not validated worst-case bounds.',
            'All-land / all-sea scenarios, if evaluated, are sensitivity cases; actual mixed-path geometry is unknown.',
            'Receiver height 10 m follows coordination criterion, not each Excel antenna height.',
            'No channel spacing or uniform spectrum inferred from necessary bandwidth 5M00.',
        ],
        'blockers': [
            'Verify software reference tests and licensing before reproducible delivery.',
            'Verify ITU ERP and effective-height field semantics.',
            'Determine terrain, sea/land path sections, climate and correction inputs.',
            'Confirm co-channel applicability and power in each 25 kHz window before comparing with 20 dBµV/m.',
            'M4 allocation mapping and Finland border/territorial-sea maxima remain unimplemented.',
        ],
    }


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('screening', type=Path)
    parser.add_argument('finland', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    artifact = prepare(json.loads(args.screening.read_text()), json.loads(args.finland.read_text()))
    artifact['inputSha256'] = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in (args.screening, args.finland)}
    args.output.write_text(json.dumps(artifact, indent=2) + '\n')