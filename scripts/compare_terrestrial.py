"""Publication-aware comparison of two terrestrial extracts; no RF calculation.

Export fxm_terra, fxm_pub_hist, pub and pub_current_circ to each input directory.
Presence differences are not inferred notification actions or withdrawals.
"""
import argparse
import csv
import hashlib
import json
from collections import Counter, defaultdict
from pathlib import Path


def read(folder, table):
    path = folder / f"{table}.csv"
    with path.open(newline="") as stream:
        rows = list(csv.DictReader(stream))
    return rows


def identity(row):
    # Provisional cross-issue identity; duplicates are quarantined, not overwritten.
    return (row.get("fragment", ""), row.get("adm", ""), row.get("assgn_id", ""))


def presence_changes(previous, current):
    indexes = []
    for rows in (previous, current):
        index = defaultdict(list)
        for row in rows:
            index[identity(row)].append(row)
        indexes.append(index)
    old, new = indexes
    changes = []
    for key in sorted(old.keys() | new.keys()):
        before, after = old.get(key, []), new.get(key, [])
        if not key[2] or len(before) > 1 or len(after) > 1:
            status = "Ambiguous identity; review required"
        elif not before:
            status = "Only in current extract; not proof of new assignment"
        elif not after:
            status = "Only in previous extract; not proof of withdrawal"
        else:
            status = "Changed raw fields" if before[0] != after[0] else "Same raw fields"
        fields = sorted(k for k in before[0].keys() | after[0].keys()
                        if before[0].get(k) != after[0].get(k)) if len(before) == len(after) == 1 else []
        changes.append({"identity": list(key), "status": status, "changedFields": fields,
                        "previous": before, "current": after})
    return changes


def load_issue(folder):
    circular = read(folder, "pub_current_circ")
    if len(circular) != 1:
        raise ValueError("Require one current circular row")
    issue = circular[0]["circ_no"]
    publications = read(folder, "pub")
    by_publication = defaultdict(list)
    for row_number, row in enumerate(publications, 2):
        by_publication[(row["pub_prefix"], row["pub_no"])].append({"csvRow": row_number, "raw": row})
    history = defaultdict(list)
    unresolved = []
    for row_number, row in enumerate(read(folder, "fxm_pub_hist"), 2):
        matches = by_publication[(row["pub_prefix"], row["pub_no"])]
        if len(matches) != 1:
            unresolved.append({"table": "fxm_pub_hist", "csvRow": row_number,
                               "reason": "Missing or ambiguous publication join", "raw": row})
        elif matches[0]["raw"]["circ_no"] == issue:
            history[row["terrakey"]].append({"csvRow": row_number, "raw": row, "publication": matches[0]})
    rows = read(folder, "fxm_terra")
    key_counts = Counter(row["terrakey"] for row in rows)
    notices = []
    for row_number, row in enumerate(rows, 2):
        if row["terrakey"] not in history:
            continue
        if key_counts[row["terrakey"]] != 1:
            unresolved.append({"table": "fxm_terra", "csvRow": row_number, "reason": "Duplicate terrakey", "raw": row})
            continue
        notices.append({"source": {"file": f"brific{issue}.mdb", "table": "fxm_terra", "csvRow": row_number},
                        "raw": row, "publicationEvidence": history[row["terrakey"]],
                        "landMobileClassPool": row["stn_cls"] in ("FB", "ML"),
                        "notificationActionRaw": row["intent"],
                        "withdrawalEvidenceRaw": row["amend_type"] == "WITHDRAWAL",
                        "status": "Publication identified; Finland relevance and P.1546 pending"})
    hashes = {t: hashlib.sha256((folder / f"{t}.csv").read_bytes()).hexdigest()
              for t in ("fxm_terra", "fxm_pub_hist", "pub", "pub_current_circ")}
    pool = [n for n in notices if n["landMobileClassPool"]]
    return {"issue": int(issue), "totalExtractRows": len(rows), "currentPublicationRows": len(notices),
            "landMobileClassPoolRows": len(pool),
            "landMobileRawActions": dict(Counter(n["notificationActionRaw"] for n in pool)),
            "landMobileAdministrations": dict(Counter(n["raw"]["adm"] for n in pool)),
            "inputCsvSha256": hashes, "notices": notices, "unresolved": unresolved}


def compare(previous_folder, current_folder):
    previous, current = load_issue(previous_folder), load_issue(current_folder)
    if current["issue"] != previous["issue"] + 1:
        raise ValueError("Require consecutive circulars")
    # Compare publication-scoped rows, not unrelated historical companion records.
    changes = presence_changes([n["raw"] for n in previous["notices"]],
                               [n["raw"] for n in current["notices"]])
    return {"scope": "Publication-aware data comparison only; no geographic relevance, field strength, coordination or interference verdict.",
            "identityScope": "Provisional fragment+administration+assignment ID; not independently validated across issues. Duplicates retained for review.",
            "classScope": "FB base station and ML land mobile station review pool, supported by embedded ref_stn_cls. Full Preface/service applicability pending.",
            "actionScope": "intent and amend_type preserved verbatim; ADD/MODIFY/SUPPRESS are not inferred from presence. Suppression and withdrawal remain distinct.",
            "references": ["https://www.itu.int/ITU-R/terrasys/docs/db/structure/"],
            "issues": [previous, current], "presenceCounts": dict(Counter(c["status"] for c in changes)),
            "presenceComparison": changes,
            "pending": ["Verify cross-issue identity and publication-part semantics", "Join geographic and transmitter/antenna inputs",
                        "Screen Finnish reception and border/territorial-sea relevance", "Validate and calculate P.1546", "Generate separate submission results"]}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("previous", type=Path)
    parser.add_argument("current", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    artifact = compare(args.previous, args.current)
    args.output.write_text(json.dumps(artifact, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"issues": [{k: v for k, v in issue.items() if k not in ("notices", "unresolved")} for issue in artifact["issues"]],
                      "presenceCounts": artifact["presenceCounts"]}))