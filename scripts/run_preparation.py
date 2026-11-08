"""Generic offline MDB preparation entry point; not an automatic RF engine.

Requires mdbtools and openpyxl. Input MDB type is checked by table inventory.
Exports remain in the explicitly selected output directory, never on page load.
"""
import argparse
import csv
import json
import shutil
import subprocess
from pathlib import Path
from normalize_finland import normalize
from screen_space import screen as screen_space
from audit_space_readiness import audit
from classify_space_candidates import run as triage
from screen_terrestrial import screen as screen_terrestrial
from compare_terrestrial import compare
from prepare_review_outputs import space_rows, terrestrial_rows, write_outputs


def export(mdb, tables, destination):
    inventory = subprocess.run(['mdb-tables','-1',str(mdb)],capture_output=True,text=True,check=True).stdout.splitlines()
    missing = set(tables)-set(inventory)
    if missing:
        raise ValueError(f'Wrong MDB type or missing tables: {sorted(missing)}')
    destination.mkdir(parents=True,exist_ok=True)
    for table in tables:
        with (destination/f'{table}.csv').open('w') as stream:
            subprocess.run(['mdb-export',str(mdb),table],stdout=stream,check=True)


def save(value,path):
    path.write_text(json.dumps(value,ensure_ascii=False,indent=2,default=str)+'\n')


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--excel',required=True,type=Path)
    parser.add_argument('--space',type=Path)
    parser.add_argument('--space-issue',type=int)
    parser.add_argument('--terrestrial',type=Path)
    parser.add_argument('--previous-terrestrial',type=Path)
    parser.add_argument('--output',required=True,type=Path)
    args=parser.parse_args()
    if not shutil.which('mdb-export') or not shutil.which('mdb-tables'):
        parser.error('Install mdbtools first')
    if not args.space and not args.terrestrial:
        parser.error('Supply at least one MDB')
    if args.space and not args.space_issue:
        parser.error('--space-issue is required; record the actual supplied issue')
    if args.previous_terrestrial and not args.terrestrial:
        parser.error('--previous-terrestrial requires --terrestrial')
    args.output.mkdir(parents=True,exist_ok=True)
    finland=normalize(args.excel);save(finland,args.output/'finland-normalized.json')
    all_rows=[]
    if args.space:
        folder=args.output/'space-tables'
        export(args.space,['notice','grp','freq','emiss','s_beam','geo','non_geo','srv_cls','s_as_stn'],folder)
        with (folder/'notice.csv').open(newline='') as stream:
            published={int(r['wic_no']) for r in csv.DictReader(stream) if r.get('wic_no')}
        if args.space_issue not in published:
            raise ValueError('Specified space issue not present in notice metadata')
        candidates=screen_space(folder,finland); inputs=audit(folder,candidates); classified=triage(folder,inputs)
        for name,value in [('space-candidates',candidates),('space-input-audit',inputs),('space-triage',classified)]:
            save(value,args.output/f'{name}.json')
        rows=space_rows(candidates,inputs,classified)
        for row in rows:
            row['issue']=args.space_issue
            row['source']['file']=args.space.name
        all_rows.extend(rows);write_outputs(rows,args.output,args.space_issue)
    if args.terrestrial:
        folder=args.output/'terrestrial-tables'
        tables=['fxm_terra','fxm_pub_hist','pub','pub_current_circ','fxm_geo','fxm_tx','fxm_ant','fxm_ant_hgt']
        export(args.terrestrial,tables,folder)
        artifact=screen_terrestrial(folder,finland);save(artifact,args.output/'terrestrial-screening.json')
        rows=terrestrial_rows(artifact);all_rows.extend(rows);write_outputs(rows,args.output,artifact['issue'])
        if args.previous_terrestrial:
            previous=args.output/'previous-tables'
            export(args.previous_terrestrial,tables[:4],previous)
            save(compare(previous,folder),args.output/'publication-comparison.json')
    save({'scope':'Offline frequency and input-presence screening; no automatic interference assessment',
          'rows':all_rows},args.output/'review-queue.json')
    print(json.dumps({'reviewRows':len(all_rows),'output':str(args.output)}))