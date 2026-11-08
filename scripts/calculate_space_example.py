"""Reproducible, conditional single-point GSO free-space PFD estimate.

Not a compliance verdict or a Finland-wide bound: nominal orbit only, no beam
pattern, atmospheric loss or orbital-tolerance maximization. The PSD-to-4kHz
step assumes the supplied maximum PSD bounds every Hz in the reference window.
Regulatory comparison remains gated separately from numeric input presence.
"""
import argparse
import json
import math
from pathlib import Path

WGS84_A_M = 6378137.0
WGS84_E2 = 6.69437999014e-3
NOMINAL_GSO_RADIUS_M = 42164000.0


def geometry(latitude_deg, longitude_deg, satellite_longitude_deg, height_m=0):
    values = (latitude_deg, longitude_deg, satellite_longitude_deg, height_m)
    if not all(math.isfinite(v) for v in values):
        raise ValueError("Geometry inputs must be finite")
    if not -90 <= latitude_deg <= 90 or not -180 <= longitude_deg <= 180:
        raise ValueError("Invalid receiver coordinates")
    if not -180 <= satellite_longitude_deg <= 180 or height_m < 0:
        raise ValueError("Invalid satellite longitude or receiver height")
    lat, lon, sat_lon = map(math.radians, values[:3])
    n = WGS84_A_M / math.sqrt(1 - WGS84_E2 * math.sin(lat) ** 2)
    receiver = ((n + height_m) * math.cos(lat) * math.cos(lon),
                (n + height_m) * math.cos(lat) * math.sin(lon),
                (n * (1 - WGS84_E2) + height_m) * math.sin(lat))
    satellite = (NOMINAL_GSO_RADIUS_M * math.cos(sat_lon),
                 NOMINAL_GSO_RADIUS_M * math.sin(sat_lon), 0)
    ray = tuple(s - r for s, r in zip(satellite, receiver))
    distance = math.sqrt(sum(v * v for v in ray))
    up = (math.cos(lat) * math.cos(lon), math.cos(lat) * math.sin(lon), math.sin(lat))
    elevation = math.degrees(math.asin(max(-1, min(1, sum(v * u for v, u in zip(ray, up)) / distance))))
    return {"slantRangeM": distance, "arrivalAngleDeg": elevation,
            "aboveGeometricHorizon": elevation > 0,
            "spreadingLossDbM2": 10 * math.log10(4 * math.pi * distance ** 2)}


def conditional_pfd(psd_dbw_hz, gain_dbi, distance_m, reference_bandwidth_hz=4000):
    if not all(math.isfinite(v) for v in (psd_dbw_hz, gain_dbi, distance_m, reference_bandwidth_hz)):
        raise ValueError("PFD inputs must be finite")
    if distance_m <= 0 or reference_bandwidth_hz <= 0:
        raise ValueError("Distance and bandwidth must be positive")
    return psd_dbw_hz + gain_dbi + 10 * math.log10(reference_bandwidth_hz) - 10 * math.log10(4 * math.pi * distance_m ** 2)


def calculate(audit, finland):
    example = audit["example"]
    rows = example["matchedFinnishSourceRows"]
    stations = [r for r in finland["records"] if r["source"]["row"] in rows]
    evidence = example["evidence"]
    if len(evidence["s_beam"]) != 1 or len(evidence["geo"]) != 1:
        raise ValueError("Example requires unique beam and GSO joins")
    beam, orbit = evidence["s_beam"][0], evidence["geo"][0]
    results = []
    for station in stations:
        raw = station["raw"]
        # Use ellipsoid surface: ASL in the Excel is not an ellipsoid height.
        location = geometry(float(raw["Latitude"]), float(raw["Longitude"]),
                            float(orbit["raw"]["long_nom"]))
        estimates = []
        for emission in evidence["emiss"]:
            psd = emission["raw"]["pwr_ds_max"]
            if not psd:
                continue
            estimates.append({"emissionCsvRow": emission["csvRow"],
                              "sequenceRaw": emission["raw"]["seq_no"],
                              "emissionRaw": emission["raw"],
                              "conditionalPfdDbwPerM2In4kHz": conditional_pfd(float(psd), float(beam["raw"]["gain"]), location["slantRangeM"]) if location["aboveGeometricHorizon"] else None})
        results.append({"station": station["station"], "source": station["source"],
                        "receiverRaw": raw, "normalizationFlags": station["flags"],
                        "geometry": location, "emissionAlternatives": estimates,
                        "limitDbwPerM2": None, "marginDb": None,
                        "status": "Conditional numerical estimate; regulatory applicability unconfirmed"})
    if not results:
        raise ValueError("No linked Finnish row found")
    return {"issue": 3074, "noticeId": example["noticeId"], "groupId": example["groupId"],
            "networkName": example["networkName"], "administration": example["administration"],
            "scope": "Single-point conditional worst-case-pointing estimates, nominal GSO orbit. Not a Finland-wide maximum, validated regulatory result or interference verdict.",
            "formula": "PSD(dBW/Hz) + gain(dBi) + 10log10(4000 Hz) - 10log10(4*pi*range_m^2)",
            "assumptions": ["Maximum reported PSD bounds all frequencies within the 4 kHz window; semantics require review",
                            "Maximum beam gain directed at the reception point, per organizer worst-case permission",
                            "Emission alternatives evaluated separately, not summed or joined by frequency sequence",
                            "WGS84 receiver surface, nominal circular equatorial GSO at 42164 km geocentric radius",
                            "Zero atmospheric/obstruction loss; orbital tolerances and footprint not evaluated",
                            "No receiving-antenna gain added: PFD is incident flux, not received power"],
            "validation": "Analytic geometry and logarithmic scaling unit tests only; no GIBC or expert benchmark validation",
            "blockers": ["Confirm EC/CP downlink service and RR21.16 equal-rights applicability with M4",
                         "Validate reported PSD and reference-window interpretation",
                         "Evaluate orbital tolerance and Finnish reception-area maxima",
                         "Compare against an independent expert or official-tool benchmark"],
            "sourceEvidence": evidence, "results": results}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("audit_summary")
    parser.add_argument("finland_normalized")
    parser.add_argument("output")
    args = parser.parse_args()
    result = calculate(json.loads(Path(args.audit_summary).read_text()), json.loads(Path(args.finland_normalized).read_text()))
    Path(args.output).write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps({"points": len(result["results"]), "scope": result["scope"]}))