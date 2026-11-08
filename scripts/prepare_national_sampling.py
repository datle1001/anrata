"""Sample explicit national footprint efficiently with Shapely, offline only."""
import argparse
import hashlib
import json
import math
from pathlib import Path
import shapely
from shapely.geometry import shape
from prepare_geographic_points import extract, boundary_points


def prepare(national, sea, settings, national_url, layer):
    raw, sea_raw = Path(national).read_bytes(), Path(sea).read_bytes()
    document, sea_document = json.loads(raw), json.loads(sea_raw)
    polygons, lines = extract(document, polygons_only=True)
    _, sea_lines = extract(sea_document)
    geometries = [shape({'type':'Polygon','coordinates':p}) for p in polygons]
    geometry = shapely.union_all(geometries)
    if not geometry.is_valid:
        raise ValueError('Invalid national geometry; do not repair silently')
    step = settings['gridStepDegrees']
    if not 0.01 <= step <= 1:
        raise ValueError('Grid step must be 0.01–1 degree')
    xmin,ymin,xmax,ymax = geometry.bounds
    candidates = [[round(ix*step,8),round(iy*step,8)]
                  for ix in range(math.ceil(xmin/step),math.floor(xmax/step)+1)
                  for iy in range(math.ceil(ymin/step),math.floor(ymax/step)+1)]
    inside = shapely.covers(geometry,shapely.points(candidates))
    groups = {'nationalGrid':[p for p,ok in zip(candidates,inside) if ok],
              'nationalPolygonBoundary':boundary_points(lines,settings['boundaryMaximumStepKm']),
              'territorialSeaOuterLimit':boundary_points(sea_lines,settings['boundaryMaximumStepKm'])}
    return {'scope':'Offline geographic sample points; no propagation or regulatory comparison',
            'settings':settings,'coordinateOrder':'longitude, latitude; WGS84 CRS84',
            'sources':[{'role':'nationalFootprint','sourceUrl':national_url,'selectedLayer':layer,
                        'sha256':hashlib.sha256(raw).hexdigest(),'license':'ODbL 1.0; OpenStreetMap/Wambacher and geoBoundaries attribution',
                        'representedYear':2017,'sourceUpdate':'2023-01-19','buildDate':'2023-12-12'},
                       {'role':'territorialSeaOuterLimit','sourceUrl':'https://julkinen.traficom.fi/inspirepalvelu/avoin/wfs',
                        'selectedLayer':'avoin:TerritorialSeaArea_L; CRS84','sha256':hashlib.sha256(sea_raw).hexdigest()}],
            'pointCounts':{k:len(v) for k,v in groups.items()},'points':groups,
            'qualifications':settings['qualifications']+[
                'National footprint includes inland waters; this is not a dry-land mask',
                'National polygon boundary includes coastline and islands; not a verified land-border-only layer',
                'Åland included; small-island completeness and positional tolerance unverified',
                'Full geoBoundaries file is not a guarantee of unsimplified survey accuracy or current legal boundaries',
                'Source vertices retained; linear lon/lat interpolation; not terrain or continuous maxima']}


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    for name in ('national','sea','output'):
        parser.add_argument(name)
    parser.add_argument('--source',required=True)
    parser.add_argument('--layer',required=True)
    parser.add_argument('--settings',default='src/data/geographic-screening-settings.json')
    args=parser.parse_args()
    artifact=prepare(args.national,args.sea,json.loads(Path(args.settings).read_text()),args.source,args.layer)
    Path(args.output).write_text(json.dumps(artifact,separators=(',',':'))+'\n')
    print(json.dumps(artifact['pointCounts']))