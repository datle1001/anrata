"""Prepare official Traficom outer-limit samples from a raw CRS84 WFS response."""
import argparse
import hashlib
import json
from pathlib import Path
from prepare_geographic_points import extract, boundary_points

SOURCE_URL = ('https://julkinen.traficom.fi/inspirepalvelu/avoin/wfs?service=WFS&version=2.0.0'
              '&request=GetFeature&typeNames=avoin%3ATerritorialSeaArea_L'
              '&outputFormat=application%2Fjson&srsName=urn:ogc:def:crs:OGC::CRS84')


def prepare(path, settings):
    raw = Path(path).read_bytes()
    document = json.loads(raw)
    _, lines = extract(document)
    points = boundary_points(lines, settings['boundaryMaximumStepKm'])
    return {
        'scope': 'Offline territorial-sea outer-limit sample preparation only; no propagation calculation or geographic maximum',
        'sourceUrl': SOURCE_URL,
        'catalogUrl': settings['territorialSeaSource'],
        'layer': 'avoin:TerritorialSeaArea_L',
        'rawSha256': hashlib.sha256(raw).hexdigest(),
        'sourceCrs': document.get('crs'),
        'coordinateOrder': 'longitude, latitude; CRS84',
        'featureCount': len(document['features']),
        'sourceProperties': [f['properties'] for f in document['features']],
        'boundaryMaximumStepKm': settings['boundaryMaximumStepKm'],
        'pointCount': len(points), 'points': points,
        'qualifications': [
            'Territorial-sea layer, not EEZ or internal-water baseline',
            'Source URL and raw response hash retained; rerun downloads may change',
            'Source dates retained per feature; no claim of 2026 legal boundary validation',
            'Linear lon/lat interpolation with great-circle spacing control; no terrain profile',
            'National land boundary and Finland-wide interior grid still pending',
            'No PFD, field strength, coordination margin or continuous maximum calculated'
        ]
    }


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('raw_wfs_geojson')
    parser.add_argument('output')
    parser.add_argument('--settings',default='src/data/geographic-screening-settings.json')
    args = parser.parse_args()
    artifact = prepare(args.raw_wfs_geojson,json.loads(Path(args.settings).read_text()))
    Path(args.output).write_text(json.dumps(artifact,indent=2,ensure_ascii=False)+'\n')
    print(json.dumps({'features':artifact['featureCount'],'points':artifact['pointCount']}))