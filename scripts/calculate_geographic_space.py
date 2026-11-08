"""Extend the existing conditional example to selected offline sample groups.

No regulatory comparison; each emission alternative evaluated separately.
"""
import argparse
import hashlib
import json
from pathlib import Path
from calculate_space_example import geometry, conditional_pfd


def calculate(example, points):
    evidence=example['sourceEvidence']
    orbit,beam=evidence['geo'],evidence['s_beam']
    if len(orbit)!=1 or len(beam)!=1:
        raise ValueError('Unique nominal GSO and beam required')
    longitude=float(orbit[0]['raw']['long_nom'])
    gain=float(beam[0]['raw']['gain'])
    results=[]
    for name,coordinates in points['points'].items():
        geometries=[(p,geometry(p[1],p[0],longitude)) for p in coordinates]
        visible=[(p,g) for p,g in geometries if g['aboveGeometricHorizon']]
        for emission in evidence['emiss']:
            psd=emission['raw']['pwr_ds_max']
            if not psd:
                continue
            maximum=max(((conditional_pfd(float(psd),gain,g['slantRangeM']),p,g) for p,g in visible),default=None)
            results.append({'sampleGroup':name,'sampleCount':len(coordinates),'visibleCount':len(visible),
                            'emissionCsvRow':emission['csvRow'],'emissionRaw':emission['raw'],
                            'sampleMaximumConditionalPfdDbwM2In4kHz':maximum[0] if maximum else None,
                            'maximumPointLonLat':maximum[1] if maximum else None,
                            'geometryAtMaximum':maximum[2] if maximum else None,
                            'limitDbwM2':None,'marginDb':None,'status':'Conditional sample maximum; regulatory comparison unresolved'})
    return {'issue':example['issue'],'noticeId':example['noticeId'],'groupId':example['groupId'],
            'networkName':example['networkName'],'scope':'Nominal-GSO conditional PFD sample maxima only; not continuous maxima or a regulatory verdict',
            'assumptions':example['assumptions'],'validation':example['validation'],
            'qualifications':points['qualifications'],'sources':points['sources'],'results':results,
            'blockers':example['blockers']+['National polygon includes coast and inland waters; true land-border layer not verified']}


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    for name in ('example','points','output'):
        parser.add_argument(name,type=Path)
    args=parser.parse_args()
    artifact=calculate(json.loads(args.example.read_text()),json.loads(args.points.read_text()))
    artifact['inputSha256']={name:hashlib.sha256(getattr(args,name).read_bytes()).hexdigest() for name in ('example','points')}
    args.output.write_text(json.dumps(artifact,indent=2)+'\n')
    print(len(artifact['results']))