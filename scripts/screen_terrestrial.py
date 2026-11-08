"""Excel-overlap and raw-input audit; NOT national relevance or P.1546.

Uses publication-scoped notices from compare_terrestrial.load_issue.
Never infer that an RX notice has no associated transmitter.
"""
import argparse
import csv
import hashlib
import json
import math
from collections import Counter, defaultdict
from pathlib import Path
from compare_terrestrial import load_issue


def finite(value):
    try:
        number = float(value)
        return number if math.isfinite(number) else None
    except (TypeError, ValueError):
        return None


def interval_matches(raw, protected):
    lower, upper = finite(raw.get("freq_min")), finite(raw.get("freq_max"))
    if lower is None or upper is None or lower > upper:
        return None
    return [r for r in protected if r.get("lowerMHz") is not None and r.get("upperMHz") is not None
            and lower <= r["upperMHz"] and r["lowerMHz"] <= upper]


def point(raw):
    # Decimal columns are retained separately from raw DMS. Never use a circle's
    # centre or a polygon vertex as a validated transmitter location.
    lat, lon = finite(raw.get("lat_dec")), finite(raw.get("long_dec"))
    if raw.get("geo_type") != "POINT" or lat is None or lon is None:
        return None
    if not -90 <= lat <= 90 or not -180 <= lon <= 180:
        return None
    return {"latitudeDeg": lat, "longitudeDeg": lon,
            "scope": "Reported decimal point; datum/encoding not independently verified"}


def indexed(folder, table, keys):
    result = defaultdict(list)
    with (folder / f"{table}.csv").open(newline="") as stream:
        for row_number, raw in enumerate(csv.DictReader(stream), 2):
            result[tuple(raw.get(k, "") for k in keys)].append({"table": table, "csvRow": row_number, "raw": raw})
    return result


def screen(folder, finland):
    issue = load_issue(folder)
    geos = indexed(folder, "fxm_geo", ["geo_key"])
    transmitters = indexed(folder, "fxm_tx", ["terrakey"])
    antennas = indexed(folder, "fxm_ant", ["terrakey", "ant_key"])
    heights = indexed(folder, "fxm_ant_hgt", ["terrakey", "ant_key"])
    records = []
    for notice in issue["notices"]:
        raw = notice["raw"]
        if not notice["landMobileClassPool"] or raw["adm"] == "FIN":
            continue
        matches = interval_matches(raw, finland["records"])
        status = ("Invalid interval; review required" if matches is None else
                  "Excel overlap; review required" if matches else
                  "No Excel overlap; national/adjacent-band relevance unresolved")
        locations = []
        # TX notices use their reported site. RX notices may carry separate
        # transmitting-station links; preserve each link and match its antenna.
        if raw["stn_type"] == "TX":
            locations.append({"origin": "Notice TX site", "geoKey": raw["geo_key"], "antKey": None})
        for tx in transmitters[(raw["terrakey"],)]:
            locations.append({"origin": "Associated transmitter; link semantics require review",
                              "geoKey": tx["raw"]["geo_key"], "antKey": tx["raw"]["ant_key"], "source": tx})
        location_evidence = []
        for location in locations:
            geo = geos[(location["geoKey"],)]
            if location["antKey"] is None:
                ant = [a for key, values in antennas.items() if key[0] == raw["terrakey"]
                       for a in values if a["raw"].get("tx_rx") == "TX"]
            else:
                ant = antennas[(raw["terrakey"], location["antKey"])]
            location_evidence.append({**location, "geoEvidence": geo,
                                      "reportedPoint": point(geo[0]["raw"]) if len(geo) == 1 else None,
                                      "antennaEvidence": [{**a, "effectiveHeightEvidence": heights[(raw["terrakey"], a["raw"]["ant_key"])]} for a in ant],
                                      "joinStatus": "Unique geographic row" if len(geo) == 1 else "Missing or ambiguous geography"})
        records.append({"notice": notice, "screenStatus": status,
                        "matchedFinnishRows": [{"station": r["station"], "source": r["source"],
                                                "protectedFrequencyBasis": r["protectedFrequencyBasis"],
                                                "lowerMHz": r["lowerMHz"], "upperMHz": r["upperMHz"], "flags": r["flags"]} for r in matches or []],
                        "transmitterLocations": location_evidence,
                        "fieldStrengthDbUvPerM": None, "criterionDbUvPerM": None,
                        "blockers": ["Confirm station/service and transmitter-link applicability", "Verify power codes/units and ERP conversion",
                                     "Validate geographic datum and propagation path", "Resolve effective height/terrain and time/path parameters",
                                     "Implement independently validated P.1546", "Evaluate M4, borders/territorial sea and adjacent frequencies"]})
    overlap = [r for r in records if r["screenStatus"] == "Excel overlap; review required"]
    return {"issue": issue["issue"], "scope": "Frequency-only Excel screening and raw relational input audit. Not complete Finnish relevance, field-strength prediction or coordination verdict.",
            "frequencyScope": "Reported min/max intervals only. No arbitrary near-frequency buffer, M4-wide exclusions or distance cutoffs.",
            "inputCsvSha256": {t: hashlib.sha256((folder / f"{t}.csv").read_bytes()).hexdigest() for t in ["fxm_geo", "fxm_tx", "fxm_ant", "fxm_ant_hgt"]},
            "metrics": {"foreignLandMobilePublicationRows": len(records), "excelOverlapRows": len(overlap),
                        "screenStatuses": dict(Counter(r["screenStatus"] for r in records)),
                        "overlapAdministrations": dict(Counter(r["notice"]["raw"]["adm"] for r in overlap)),
                        "overlapRowsWithReportedPoint": sum(any(l["reportedPoint"] for l in r["transmitterLocations"]) for r in overlap),
                        "finnishRowsWithoutInterval": sum(r["lowerMHz"] is None or r["upperMHz"] is None for r in finland["records"])},
            "publicationJoinUnresolved": issue["unresolved"], "records": records}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("tables", type=Path)
    parser.add_argument("finland", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    artifact = screen(args.tables, json.loads(args.finland.read_text()))
    args.output.write_text(json.dumps(artifact, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps(artifact["metrics"]))