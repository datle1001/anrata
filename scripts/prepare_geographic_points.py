"""Offline WGS84 GeoJSON sampling, never a propagation/compliance calculation.

Require explicitly selected land polygons and territorial-sea OUTER boundary
lines/polygons. Never guess a layer from a multi-layer download. Raw geometry
stays outside the repository; SHA256, source and selected-layer labels travel
with the output. Uses planar point-in-polygon in lon/lat for Finland only.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path


def distance_km(a, b):
    lon1, lat1, lon2, lat2 = map(math.radians, [*a, *b])
    h = math.sin((lat2-lat1)/2)**2 + math.cos(lat1)*math.cos(lat2)*math.sin((lon2-lon1)/2)**2
    return 6371.0088 * 2 * math.asin(math.sqrt(min(1, h)))


def in_ring(point, ring):
    x, y = point
    inside = False
    for a, b in zip(ring, ring[1:]):
        ax, ay = a[:2]
        bx, by = b[:2]
        cross = (x-ax)*(by-ay) - (y-ay)*(bx-ax)
        if abs(cross) < 1e-10 and min(ax,bx) <= x <= max(ax,bx) and min(ay,by) <= y <= max(ay,by):
            return True
        if (ay > y) != (by > y) and x < (bx-ax)*(y-ay)/(by-ay)+ax:
            inside = not inside
    return inside


def in_polygon(point, rings):
    return in_ring(point, rings[0]) and not any(in_ring(point, hole) for hole in rings[1:])


def geometries(document):
    if document['type'] == 'FeatureCollection':
        return [f['geometry'] for f in document['features'] if f.get('geometry')]
    if document['type'] == 'Feature':
        return [document['geometry']]
    return [document]


def extract(document, polygons_only=False):
    crs = document.get('crs')
    if crs and not any(code in json.dumps(crs) for code in ('CRS84', 'CRS::84', '4326')):
        raise ValueError('Convert source to WGS84 EPSG:4326 before sampling')
    polygons, lines = [], []
    for g in geometries(document):
        kind, c = g['type'], g['coordinates']
        if kind == 'Polygon':
            polygons.append(c)
            lines.append(c[0])
        elif kind == 'MultiPolygon':
            polygons.extend(c)
            lines.extend(p[0] for p in c)
        elif kind == 'LineString' and not polygons_only:
            lines.append(c)
        elif kind == 'MultiLineString' and not polygons_only:
            lines.extend(c)
        else:
            raise ValueError('Expected selected polygon or boundary-line geometry')
    if not lines:
        raise ValueError('No selected geometry')
    for line in lines + [hole for p in polygons for hole in p[1:]]:
        if len(line) < 2:
            raise ValueError('Degenerate geometry')
        for point in line:
            lon, lat = point[:2]
            if not all(math.isfinite(v) for v in (lon,lat)) or not (15 <= lon <= 40 and 50 <= lat <= 75):
                raise ValueError('Expected Finland-region WGS84 coordinates')
        if any(abs(a[0]-b[0]) > 180 for a,b in zip(line,line[1:])):
            raise ValueError('Dateline geometry unsupported')
    for p in polygons:
        if any(r[0][:2] != r[-1][:2] or len(r) < 4 for r in p):
            raise ValueError('Polygon rings must be closed')
    return polygons, lines


def grid_points(polygons, step):
    if not math.isfinite(step) or step < 0.01 or step > 1:
        raise ValueError('Grid step must be 0.01–1 degree')
    vertices = [v for p in polygons for v in p[0]]
    xmin, xmax = min(v[0] for v in vertices), max(v[0] for v in vertices)
    ymin, ymax = min(v[1] for v in vertices), max(v[1] for v in vertices)
    points = []
    for ix in range(math.ceil(xmin/step), math.floor(xmax/step)+1):
        for iy in range(math.ceil(ymin/step), math.floor(ymax/step)+1):
            point = [round(ix*step,8), round(iy*step,8)]
            if any(in_polygon(point,p) for p in polygons):
                points.append(point)
    return points


def boundary_points(lines, maximum_step_km):
    if not math.isfinite(maximum_step_km) or maximum_step_km <= 0:
        raise ValueError('Boundary step must be positive')
    points = set()
    for line in lines:
        for a,b in zip(line,line[1:]):
            count = max(1, math.ceil(distance_km(a[:2], b[:2])/maximum_step_km))
            for i in range(count+1):
                points.add(tuple(round(a[j]+(b[j]-a[j])*i/count,8) for j in (0,1)))
    return [list(p) for p in sorted(points)]


def review_status(margin_db, *, applicability_confirmed, near_limit_margin_db=3):
    """margin = applicable limit minus calculated level in matched units."""
    if not math.isfinite(near_limit_margin_db) or near_limit_margin_db < 0:
        raise ValueError('Review buffer must be finite and nonnegative')
    if not applicability_confirmed or margin_db is None:
        return 'unresolved'
    if not math.isfinite(margin_db):
        raise ValueError('Margin must be finite')
    if margin_db < 0:
        return 'exceeds-applicable-threshold'
    if margin_db <= near_limit_margin_db:
        return 'near-limit'
    return 'below-threshold-at-evaluated-points'


def prepare(land_path, sea_path, settings, land_source, sea_source, land_layer, sea_layer):
    land_bytes, sea_bytes = Path(land_path).read_bytes(), Path(sea_path).read_bytes()
    polygons, land_lines = extract(json.loads(land_bytes), polygons_only=True)
    _, sea_lines = extract(json.loads(sea_bytes))
    step = settings['boundaryMaximumStepKm']
    groups = {
        'nationalGrid': grid_points(polygons, settings['gridStepDegrees']),
        'nationalPolygonBoundary': boundary_points(land_lines, step),
        'territorialSeaOuterLimit': boundary_points(sea_lines, step),
    }
    return {
        'scope': 'Offline geographic evaluation points only; no PFD, propagation or regulatory comparison',
        'status': 'Prepared from explicitly selected source geometry; not independently boundary-validated',
        'settings': settings,
        'sources': [
            {'role':role, 'sourceUrl':source, 'selectedLayer':layer, 'sha256':hashlib.sha256(raw).hexdigest()}
            for role,source,layer,raw in [('nationalPolygon',land_source,land_layer,land_bytes),
                                        ('territorialSeaOuterLimit',sea_source,sea_layer,sea_bytes)]
        ],
        'coordinateOrder': 'longitude, latitude; WGS84 EPSG:4326',
        'pointCounts': {key:len(value) for key,value in groups.items()},
        'points':groups,
        'qualifications': settings['qualifications'] + [
            'National polygon boundary may include maritime segments; not labelled land border without source verification',
            'Grid uses lon/lat ray casting with polygon holes; thin areas can have no interior grid point',
            'Boundary interpolation is linear in lon/lat, not terrain or geodesic path tracing',
            'Source geometry generalization and selected layers must be reviewed; hashes identify the exact converted input',
            'Separate boundary samples do not establish continuous propagation maxima'
        ]
    }


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('land_geojson')
    parser.add_argument('territorial_sea_outer_limit_geojson')
    parser.add_argument('output')
    parser.add_argument('--settings', default='src/data/geographic-screening-settings.json')
    for role in ('land','sea'):
        parser.add_argument(f'--{role}-source', required=True)
        parser.add_argument(f'--{role}-layer', required=True)
    args = parser.parse_args()
    result = prepare(args.land_geojson, args.territorial_sea_outer_limit_geojson,
                     json.loads(Path(args.settings).read_text()), args.land_source, args.sea_source,
                     args.land_layer, args.sea_layer)
    Path(args.output).write_text(json.dumps(result, indent=2, ensure_ascii=False)+'\n')
    print(json.dumps(result['pointCounts']))