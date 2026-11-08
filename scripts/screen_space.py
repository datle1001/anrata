"""Offline frequency-only candidate screening, not a PFD calculation.

Usage: python scripts/screen_space.py EXTRACTED_TABLE_DIR FINLAND_JSON OUTPUT_JSON
Export notice, grp and freq to CSV with mdb-export before running.
"""
import csv
import json
import sys
import time
from pathlib import Path


def overlapping(a_min, a_max, b_min, b_max):
    return a_min <= b_max and b_min <= a_max


def number(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def read_table(folder, table):
    with (folder / (table + ".csv")).open(newline="") as f:
        return list(csv.DictReader(f))


def screen(folder, finland):
    start = time.perf_counter()
    notices = {r["ntc_id"]: r for r in read_table(folder, "notice")}
    groups = {r["grp_id"]: r for r in read_table(folder, "grp")}
    frequencies = read_table(folder, "freq")
    protected = [r for r in finland["records"] if r["lowerMHz"] is not None]
    candidates = []
    unresolved = []
    transmitting_rows = 0
    for csv_row, frequency in enumerate(frequencies, 2):
        notice = notices.get(frequency["ntc_id"])
        group = groups.get(frequency["grp_id"])
        if not notice or not group or group["ntc_id"] != frequency["ntc_id"]:
            unresolved.append({"csvRow": csv_row, "reason": "Missing or inconsistent relation"})
            continue
        # E/R beam codes: https://www.itu.int/sns/demogrp.html
        direction = frequency.get("emi_rcp")
        if direction != group.get("emi_rcp") or direction not in ("E", "R"):
            unresolved.append({"csvRow": csv_row, "reason": "Unknown or inconsistent beam direction"})
            continue
        if direction != "E" or notice["adm"] == "FIN":
            continue
        transmitting_rows += 1
        lower, upper = number(frequency["freq_min"]), number(frequency["freq_max"])
        if lower is None or upper is None or lower > upper:
            unresolved.append({"csvRow": csv_row, "reason": "Missing or invalid frequency interval"})
            continue
        matches = [r for r in protected if overlapping(lower, upper, r["lowerMHz"], r["upperMHz"])]
        if not matches:
            continue
        candidates.append({"noticeId": frequency["ntc_id"], "groupId": frequency["grp_id"],
                           "frequencySequence": frequency["seq_no"], "administration": notice["adm"],
                           "beam": frequency["beam_name"], "lowerMHz": lower, "upperMHz": upper,
                           "noticeIssue": notice["wic_no"], "groupIssue": group["wic_no"],
                           "frequencyIssue": frequency["wic_no"], "noticeProvision": notice["prov"],
                           "status": "Frequency-overlap candidate; technical review pending",
                           "source": {"file": "ific3074.mdb", "table": "freq", "csvRow": csv_row,
                                      "key": {k: frequency[k] for k in ("ntc_id", "grp_id", "seq_no")}},
                           "matchedFinnishRows": [{"station": r["station"], "sourceRow": r["source"]["row"],
                                                   "flags": r["flags"]} for r in matches],
                           "pendingChecks": ["M4 service applicability", "Space versus earth station beam type",
                                             "Orbit and Finnish reception geography", "Applicable RR provision",
                                             "Power and antenna units", "Validated PFD calculation"],
                           "rawFrequency": frequency})
    return {"scope": "Preliminary Excel frequency overlap only. Not a Finland-wide relevance or interference verdict. No M4, geographic, satellite-beam type or PFD validation yet. Historical groups retained within notices published in this extract.",
            "references": ["https://www.itu.int/sns/demogrp.html", "https://www.itu.int/sns/demoassgn.html",
                           "https://www.itu.int/en/ITU-R/space/Documents/sns_dbv91.pdf"],
            "metrics": {"noticeRows": len(notices), "frequencyRows": len(frequencies),
                        "foreignEmissionFrequencyRows": transmitting_rows,
                        "candidateFrequencyRows": len(candidates),
                        "candidateNotices": len({r["noticeId"] for r in candidates}),
                        "unresolvedFrequencyRows": len(unresolved),
                        "unresolvedFinnishIntervals": len(finland["records"]) - len(protected),
                        "elapsedSeconds": round(time.perf_counter() - start, 3)},
            "candidates": candidates, "unresolved": unresolved}


if __name__ == "__main__":
    result = screen(Path(sys.argv[1]), json.loads(Path(sys.argv[2]).read_text()))
    output = Path(sys.argv[3])
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2))
    print(json.dumps(result["metrics"]))