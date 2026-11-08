"""Audit raw input presence after frequency screening; never compute PFD.

Run: python scripts/audit_space_readiness.py TABLE_DIR CANDIDATES_JSON OUTPUT_JSON
Missing/ambiguous joins remain in the audit. Numerical input presence does not
establish units, downlink service, regulatory applicability or calculation validity.
"""
import csv
import json
import math
import sys
from collections import Counter, defaultdict
from pathlib import Path


def rows(folder, table):
    with (folder / f"{table}.csv").open(newline="") as source:
        return list(csv.DictReader(source))


def index(records, keys):
    result = defaultdict(list)
    for row_number, record in enumerate(records, 2):
        result[tuple(record.get(key, "") for key in keys)].append(
            {"csvRow": row_number, "raw": record})
    return result


def finite(value):
    try:
        return math.isfinite(float(value))
    except (ValueError, TypeError):
        return False


def join_state(matches):
    return "matched" if len(matches) == 1 else "missing" if not matches else "ambiguous"


def audit(folder, candidates):
    beams = index(rows(folder, "s_beam"), ("ntc_id", "emi_rcp", "beam_name"))
    geo = index(rows(folder, "geo"), ("ntc_id",))
    non_geo = index(rows(folder, "non_geo"), ("ntc_id",))
    notices = index(rows(folder, "notice"), ("ntc_id",))
    emissions = index(rows(folder, "emiss"), ("grp_id",))
    services = index(rows(folder, "srv_cls"), ("grp_id",))
    groups = defaultdict(list)
    for candidate in candidates["candidates"]:
        groups[candidate["groupId"]].append(candidate)
    reports = []
    for group_id, frequencies in groups.items():
        first = frequencies[0]
        nid = first["noticeId"]
        beam_matches = beams.get((nid, "E", first["beam"]), [])
        orbit_matches = geo.get((nid,), [])
        emission_matches = emissions.get((group_id,), [])
        service_matches = services.get((group_id,), [])
        notice_matches = notices.get((nid,), [])
        notice_raw = notice_matches[0]["raw"] if len(notice_matches) == 1 else {}
        beam_raw = beam_matches[0]["raw"] if len(beam_matches) == 1 else {}
        orbit_raw = orbit_matches[0]["raw"] if len(orbit_matches) == 1 else {}
        has_density = any(finite(row["raw"].get("pwr_ds_max")) for row in emission_matches)
        gso_numeric = (notice_raw.get("ntc_type") == "G" and len(orbit_matches) == 1
                       and finite(orbit_raw.get("long_nom")))
        blockers = ["Verify power-density and gain semantics/units from ITU dictionary",
                    "Verify space-to-Earth service and applicable RR table/provision",
                    "Verify M4 protected-service applicability",
                    "Define Finnish reception-area evaluation points",
                    "Validate geometry, reference bandwidth and PFD implementation"]
        if len(beam_matches) != 1:
            blockers.append("Missing or ambiguous emitting s_beam join")
        if not finite(beam_raw.get("gain")):
            blockers.append("Missing or non-finite raw antenna gain")
        if not has_density:
            blockers.append("Missing or non-finite raw emission power density")
        if not service_matches:
            blockers.append("Missing service-class rows")
        if not gso_numeric:
            blockers.append("Outside initial GSO orbit-input subset; retain for separate review")
        has_inputs = (len(beam_matches) == 1 and gso_numeric and
                      finite(beam_raw.get("gain")) and has_density and bool(service_matches))
        reports.append({
            "noticeId": nid, "groupId": group_id, "administration": first["administration"],
            "beam": first["beam"], "networkName": orbit_raw.get("sat_name"),
            "noticeTypeRaw": notice_raw.get("ntc_type"),
            "frequencyRows": len(frequencies),
            "frequencyIntervalsMHz": sorted({(r["lowerMHz"], r["upperMHz"]) for r in frequencies}),
            "matchedFinnishSourceRows": sorted({m["sourceRow"] for r in frequencies
                                                for m in r["matchedFinnishRows"]}),
            "beamJoin": join_state(beam_matches), "gsoJoin": join_state(orbit_matches),
            "nonGsoRows": len(non_geo.get((nid,), [])),
            "rawNumericGsoInputsPresent": has_inputs,
            "status": "Unvalidated inputs present" if has_inputs else "Input gaps or other orbit scenario",
            "calculationStatus": "Not calculated", "blockers": blockers,
            "evidence": {"file": "ific3074.mdb", "s_beam": beam_matches,
                         "geo": orbit_matches, "emiss": emission_matches,
                         "srv_cls": service_matches},
        })
    reports.sort(key=lambda item: (not item["rawNumericGsoInputsPresent"], item["noticeId"], item["groupId"]))
    return {
        "scope": "Raw input-presence audit of Excel-overlap candidates only. No PFD calculation, unit validation, M4 assessment or Finland-wide relevance verdict. Input presence is not calculation readiness.",
        "source": "ific3074.mdb",
        "metrics": {"candidateGroups": len(reports),
                    "candidateNotices": len({r["noticeId"] for r in reports}),
                    "unvalidatedGsoGroupsWithRawInputs": sum(r["rawNumericGsoInputsPresent"] for r in reports),
                    "beamJoinStates": dict(Counter(r["beamJoin"] for r in reports)),
                    "pfdCalculations": 0},
        "groups": reports,
    }


if __name__ == "__main__":
    result = audit(Path(sys.argv[1]), json.loads(Path(sys.argv[2]).read_text()))
    output = Path(sys.argv[3])
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2))
    print(json.dumps(result["metrics"]))