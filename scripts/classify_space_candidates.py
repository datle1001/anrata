"""Conservative link-type triage; retained records still need destination checks."""
import json
import sys
from collections import Counter
from pathlib import Path
from audit_space_readiness import index, rows


def classify(notice_type, beam_state, service_classes, associated_space_rows):
    if notice_type not in ("G", "N"):
        return "outside_satellite_notice_scope"
    if beam_state != "matched":
        return "unresolved_satellite_beam"
    if "ES" in service_classes or associated_space_rows:
        return "space_endpoint_or_intersatellite_review"
    if not service_classes:
        return "missing_service_class"
    if set(service_classes) & {"E1", "E2", "E3", "E4"}:
        return "sensor_service_separate_review"
    return "downlink_review_pool_destination_unverified"


def run(folder, audit):
    associated = index(rows(folder, "s_as_stn"), ("grp_id",))
    classified = []
    for group in audit["groups"]:
        classes = sorted({r["raw"]["stn_cls"] for r in group["evidence"]["srv_cls"]})
        state = classify(group["noticeTypeRaw"], group["beamJoin"], classes,
                         len(associated.get((group["groupId"],), [])))
        classified.append({"noticeId": group["noticeId"], "groupId": group["groupId"],
                           "frequencyRows": group["frequencyRows"], "serviceClassesRaw": classes,
                           "classification": state,
                           "associatedSpaceEvidence": associated.get((group["groupId"],), [])})
    counts = Counter()
    for group in classified:
        counts[group["classification"]] += group["frequencyRows"]
    pool = [g for g in classified if g["classification"] == "downlink_review_pool_destination_unverified"]
    return {"scope": "Conservative link-type triage after Excel frequency overlap. No M4/geographic/PFD validation. Pool membership does not prove an Earth destination. All quarantined groups retained.",
            "references": ["https://www.itu.int/en/ITU-R/space/Documents/sns_dbv91.pdf",
                           "https://www.itu.int/en/ITU-R/space/Preface/preface_e.pdf"],
            "metrics": {"frequencyRowsByClassification": dict(counts),
                        "downlinkReviewPoolNotices": len({g["noticeId"] for g in pool}),
                        "downlinkReviewPoolGroups": len(pool)}, "groups": classified}


if __name__ == "__main__":
    result = run(Path(sys.argv[1]), json.loads(Path(sys.argv[2]).read_text()))
    Path(sys.argv[3]).write_text(json.dumps(result, indent=2))
    print(json.dumps(result["metrics"]))