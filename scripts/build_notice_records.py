"""Build compact technical notice records + transparent review-priority scores.

Input: CSV exports of Space IFIC tables (notice, geo, non_geo, grp, srv_cls, emiss)
plus space3074-frequency-candidates.json from screen_space.py.
Output: one record per candidate notice with raw values, provenance and a points-based
review-priority score. The score orders expert reading; it is NOT an interference verdict.

Usage: python3 scripts/build_notice_records.py <csv_folder> <candidates.json> <settings.json> <out.json>
"""
import csv, json, sys
from collections import defaultdict
from pathlib import Path


def read(folder, name):
    with open(Path(folder) / f"{name}.csv", newline="", encoding="utf-8", errors="replace") as f:
        return list(csv.DictReader(f))


def score(features, w):
    parts = []
    s = min(w["finnishStationPointsCap"], features["finnishStations"] * w["pointsPerFinnishStation"])
    parts.append({"factor": f"{features['finnishStations']} Finnish RX stations share frequencies", "points": s})
    e = min(w["overlapRowPointsCap"], features["overlapRows"] // w["overlapRowsPerPoint"])
    parts.append({"factor": f"{features['overlapRows']} overlapping space-to-Earth frequency rows", "points": e})
    if features["visibleFromFinland"] is not False:
        parts.append({"factor": "Orbit can be visible from Finland" if features["visibleFromFinland"] else "Non-GSO orbit: visibility not excluded", "points": w["visibilityPoints"]})
    if features["missingPower"]:
        parts.append({"factor": "Power density missing for some emissions (cannot be cleared)", "points": w["missingInputPoints"]})
    if features["newThisIssue"]:
        parts.append({"factor": "Groups first published in this issue", "points": w["newInIssuePoints"]})
    total = min(100, sum(p["points"] for p in parts))
    band = "high" if total >= w["highThreshold"] else "medium" if total >= w["mediumThreshold"] else "low"
    return total, band, parts


def gso_visible(long_nom, fin_long=25.0, max_sep=76.0):
    # Simple bound: GSO is above horizon at ~60-70N only within ~±76° longitude separation.
    try:
        sep = abs(((float(long_nom) - fin_long) + 180) % 360 - 180)
    except (TypeError, ValueError):
        return None
    return sep <= max_sep


def build(folder, candidates_path, settings_path):
    w = json.loads(Path(settings_path).read_text())["weights"]
    issue = None
    notices = {r["ntc_id"]: r for r in read(folder, "notice")}
    geo = {r["ntc_id"]: r for r in read(folder, "geo")}
    ngeo = {r["ntc_id"]: r for r in read(folder, "non_geo")}
    grp = {r["grp_id"]: r for r in read(folder, "grp")}
    cls = defaultdict(set)
    for r in read(folder, "srv_cls"):
        cls[r["grp_id"]].add(f"{r['stn_cls']}/{r['nat_srv']}")
    emi = defaultdict(list)
    for r in read(folder, "emiss"):
        emi[r["grp_id"]].append(r)
    cand = json.loads(Path(candidates_path).read_text())["candidates"]
    by_ntc = defaultdict(list)
    for c in cand:
        by_ntc[c["noticeId"]].append(c)
    records = []
    for ntc_id, rows in by_ntc.items():
        n = notices[ntc_id]; issue = n["wic_no"]
        g, ng = geo.get(ntc_id), ngeo.get(ntc_id)
        groups = sorted({r["groupId"] for r in rows})
        emissions = [e for gid in groups for e in emi.get(gid, [])]
        stations = sorted({m["station"] for r in rows for m in r["matchedFinnishRows"]})
        missing_power = any(e["pwr_ds_max"] in ("", None) for e in emissions) or not emissions
        visible = gso_visible(g["long_nom"]) if g else (True if ng else None)
        new = any(grp.get(gid, {}).get("wic_no") == n["wic_no"] for gid in groups)
        feats = {"finnishStations": len(stations), "overlapRows": len(rows), "visibleFromFinland": visible,
                 "missingPower": missing_power, "newThisIssue": new}
        total, band, parts = score(feats, w)
        pwr = [float(e["pwr_ds_max"]) for e in emissions if e["pwr_ds_max"] not in ("", None)]
        records.append({
            "noticeId": ntc_id, "publication": f"Space IFIC {n['wic_no']}", "administration": n["adm"],
            "network": (g or ng or {}).get("sat_name") or ntc_id,
            "orbit": f"GSO {g['long_nom']}°" if g else ("Non-GSO" if ng else "Not stated"),
            "orbitRaw": g or ng or None,
            "frequencyLowMHz": min(r["lowerMHz"] for r in rows), "frequencyHighMHz": max(r["upperMHz"] for r in rows),
            "service": sorted({c for gid in groups for c in cls.get(gid, [])}),
            "emissions": sorted({e["design_emi"] for e in emissions if e["design_emi"]})[:12],
            "powerDensityDbwHz": {"min": min(pwr), "max": max(pwr)} if pwr else None,
            "reference": {"provision": n["prov"], "noticeType": n["ntc_type"], "action": n["act_code"], "status": n["st_cur"]},
            "finnishStations": stations[:50], "features": feats,
            "priority": {"score": total, "band": band, "factors": parts},
            "source": {"file": "ific3074.mdb", "tables": ["notice", "geo/non_geo", "grp", "srv_cls", "emiss", "freq"], "candidateRows": len(rows)},
        })
    records.sort(key=lambda r: -r["priority"]["score"])
    return {"scope": "Review-priority ordering of Excel frequency-overlap notices. Scores rank reading order only; they are not interference, PFD or compliance verdicts.",
            "issue": issue, "weights": w, "records": records}


if __name__ == "__main__":
    folder, candidates, settings, out = sys.argv[1:5]
    Path(out).write_text(json.dumps(build(folder, candidates, settings), indent=1) + "\n")
