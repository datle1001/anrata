"""Automated worst-case PFD screening for GSO space-to-Earth groups (IFIC Space).

For every GSO notice in the notice-records file and every space-to-Earth group whose
frequency range falls inside an encoded Table 21-4 row (src/data/pfd-limits.json):
  PFD = PSD_max(dBW/Hz) + G_max(dBi) + 10log10(refBW) - 10log10(4*pi*d^2)
evaluated at every Finnish station coordinate (Traficom list) (874 points spread across
Finland; a sampled maximum, not a continuous national maximum); the limit is evaluated at the same point's arrival angle. The reported case is
the point with the largest PFD-minus-limit margin.

Assumptions (organizer-permitted worst case): maximum beam gain pointed at the point,
max PSD bounds every Hz of the reference band, nominal GSO position, free space.
Output is a screening result for expert review, never a compliance verdict.

Usage: python3 scripts/screen_gso_pfd.py <csv_folder> <records.json> <finland.json> <limits.json> <out.json>
"""
import csv, json, math, sys, hashlib, datetime
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from calculate_space_example import geometry  # noqa: E402

FINLAND_BBOX = (59.8, 70.1, 20.5, 31.6)


def read(folder, name):
    with open(Path(folder) / f"{name}.csv", newline="", encoding="utf-8", errors="replace") as f:
        return list(csv.DictReader(f))


def fnum(v):
    try:
        x = float(v)
        return x if math.isfinite(x) else None
    except (TypeError, ValueError):
        return None


def limit_at(row, angle):
    if angle <= 5:
        return row["lowAngleDb"]
    if angle < 25:
        return row["lowAngleDb"] + row["slopeDbPerDeg"] * (angle - 5)
    return row["highAngleDb"]


def pfd(psd, gain, distance, ref_bw):
    return psd + gain + 10 * math.log10(ref_bw) - 10 * math.log10(4 * math.pi * distance ** 2)


def evaluation_points(finland):
    pts = []
    for s in finland["records"]:
        la, lo = fnum(s["raw"].get("Latitude")), fnum(s["raw"].get("Longitude"))
        if la and lo and FINLAND_BBOX[0] - 1 < la < FINLAND_BBOX[1] + 1:
            pts.append({"lat": la, "lon": lo, "label": f"Station {s['station']}"})
    return pts


def evaluate_group(psd, gain, sat_lon, row, points):
    best = None
    for p in points:
        g = geometry(p["lat"], p["lon"], sat_lon)
        if not g["aboveGeometricHorizon"]:
            continue
        val = pfd(psd, gain, g["slantRangeM"], row["referenceBandwidthHz"])
        lim = limit_at(row, g["arrivalAngleDeg"])
        if best is None or val - lim > best["marginDb"]:
            best = {"point": p, "arrivalAngleDeg": round(g["arrivalAngleDeg"], 2),
                    "slantRangeKm": round(g["slantRangeM"] / 1000, 1),
                    "spreadingLossDb": round(g["spreadingLossDbM2"], 2),
                    "pfdDb": round(val, 2), "limitDb": round(lim, 2), "marginDb": round(val - lim, 2)}
    return best


def screen(folder, records_path, finland_path, limits_path):
    records = json.loads(Path(records_path).read_text())
    finland = json.loads(Path(finland_path).read_text())
    limits = json.loads(Path(limits_path).read_text())
    geo = {r["ntc_id"]: fnum(r["long_nom"]) for r in read(folder, "geo")}
    beams = {(r["ntc_id"], r["beam_name"]): fnum(r["gain"]) for r in read(folder, "s_beam") if r["emi_rcp"] == "E"}
    groups = defaultdict(list)
    for g in read(folder, "grp"):
        if g["emi_rcp"] == "E":
            groups[g["ntc_id"]].append(g)
    psd = defaultdict(list)
    for e in read(folder, "emiss"):
        v = fnum(e["pwr_ds_max"])
        if v is not None:
            psd[e["grp_id"]].append(v)
    points = evaluation_points(finland)
    out = {}
    for rec in records["records"]:
        nid = rec["noticeId"]
        if not rec["orbit"].startswith("GSO"):
            out[nid] = {"status": "not-calculable", "reason": "Non-GSO: Article 22 EPFD needs time-domain simulation (e.g. ITU EPFD software); not computed here.", "groups": []}
            continue
        sat_lon = geo.get(nid)
        calc, skipped = [], defaultdict(int)
        for g in groups.get(nid, []):
            lo, hi = fnum(g["freq_min"]), fnum(g["freq_max"])
            row = next((r for r in limits["limits"] if lo is not None and hi is not None and lo < r["highMHz"] and hi > r["lowMHz"]), None)
            if row is None:
                skipped["no encoded Table 21-4 row for this band"] += 1; continue
            gain = beams.get((nid, g["beam_name"]))
            if gain is None:
                skipped["beam gain missing"] += 1; continue
            if not psd[g["grp_id"]]:
                skipped["max power density missing"] += 1; continue
            p = max(psd[g["grp_id"]])
            best = evaluate_group(p, gain, sat_lon, row, points) if sat_lon is not None else None
            if best is None:
                skipped["satellite below horizon for all Finland points"] += 1; continue
            calc.append({"groupId": g["grp_id"], "beam": g["beam_name"], "freqLowMHz": lo, "freqHighMHz": hi,
                         "limitId": row["id"], "citation": row["citation"], "service": row["service"],
                         "footnoteCheck": row.get("footnoteCheck"),
                         "referenceBandwidthHz": row["referenceBandwidthHz"],
                         "inputs": {"psdMaxDbwHz": p, "gainMaxDbi": gain, "satelliteLongitudeDeg": sat_lon},
                         "worstPoint": best})
        calc.sort(key=lambda c: -c["worstPoint"]["marginDb"])
        if calc:
            m = calc[0]["worstPoint"]["marginDb"]
            status = "exceeds" if m > 0 else "near-limit" if m > -3 else "within"
        else:
            status = "not-calculable"
        out[nid] = {"status": status, "reason": "; ".join(f"{n} group(s): {k}" for k, n in skipped.items()) or None,
                    "worstMarginDb": calc[0]["worstPoint"]["marginDb"] if calc else None,
                    "groupsCalculated": len(calc), "groups": calc[:8]}
    wanted = {sid for r in records["records"] for sid in r["finnishStations"]}
    stations = {}
    for st in finland["records"]:
        if st["station"] in wanted and st["station"] not in stations:
            stations[st["station"]] = {"class": st["licenceClass"], "rxMHz": st["protectedFrequencyMHz"],
                                       "lowMHz": st["lowerMHz"], "highMHz": st["upperMHz"],
                                       "lat": fnum(st["raw"].get("Latitude")), "lon": fnum(st["raw"].get("Longitude")),
                                       "excelRow": st["source"]["row"]}
    digest = hashlib.sha256(Path(limits_path).read_bytes()).hexdigest()
    return {"issue": records["issue"], "generatedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
            "method": "PFD = PSDmax + Gmax + 10log10(refBW) - 10log10(4*pi*d^2); limit from Table 21-4 at the point's arrival angle; worst margin over evaluation points",
            "assumptions": ["Maximum beam gain pointed at each evaluation point (organizer-permitted worst case)",
                            "Maximum filed power density bounds every Hz of the reference bandwidth",
                            "Nominal GSO longitude, WGS84 Earth, free-space spreading, no atmospheric loss",
                            "Near-limit = within 3 dB below the limit (editable in script)"],
            "evaluationPoints": len(points), "limitsSha256": digest,
            "scope": "Screening result for expert review; not a compliance verdict", "results": out, "finnishStations": stations,
            "inputs": {"ific": "ific3074.mdb tables geo, grp, s_beam, emiss", "finland": "Traficom_SinceAI_Frequencies_of_interest_v05112026.xlsx (normalized)", "limits": "src/data/pfd-limits.json"},
            "script": "scripts/screen_gso_pfd.py"}


if __name__ == "__main__":
    folder, rec, fin, lim, dst = sys.argv[1:6]
    res = screen(folder, rec, fin, lim)
    Path(dst).write_text(json.dumps(res, indent=1))
    from collections import Counter
    print(Counter(v["status"] for v in res["results"].values()))
