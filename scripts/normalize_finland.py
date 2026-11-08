"""Reproducible normalization of the challenge's synthetic Finnish Excel.

Run: python3 scripts/normalize_finland.py INPUT.xlsx OUTPUT.json
Requires openpyxl. Keeps every source row, including duplicates and anomalies.
"""
import json
import hashlib
import re
import sys
from pathlib import Path


def quantity_mhz(value):
    """Read explicit frequency/bandwidth units; never guess bare numbers."""
    if value is None or str(value).strip() == "":
        return None
    text = str(value).strip().replace(",", ".")
    # ITU necessary-bandwidth notation places the unit at the decimal point.
    # Keep ordinary explicit-unit notation separate from forms such as 8M00.
    coded = re.fullmatch(r"([0-9]{1,3})([HhKkMG])([0-9]{1,3})", text)
    if coded and len(coded.group(1)) + len(coded.group(3)) == 3:
        scale = {"H": .000001, "K": .001, "M": 1, "G": 1000}
        return float(coded.group(1) + "." + coded.group(3)) * scale[coded.group(2).upper()]
    match = re.fullmatch(r"([0-9]+(?:\.[0-9]+)?)\s*(GHz|MHz|kHz|Hz|G|M|k|K|H)", text)
    if not match:
        return None
    scale = {"GHz": 1000, "G": 1000, "MHz": 1, "M": 1,
             "kHz": .001, "k": .001, "K": .001, "Hz": .000001, "H": .000001}
    return float(match.group(1)) * scale[match.group(2)]


def protected_frequency(tx, rx):
    """Organizer rule: protect RX, otherwise TX received within Finland."""
    if rx is not None:
        return rx, "RX"
    return tx, "TX fallback"


def effective_bandwidth(channel, transmission):
    known = [v for v in (channel, transmission) if v is not None and v > 0]
    return min(known) if known else None


def normalize(input_path):
    import openpyxl
    sheet = openpyxl.load_workbook(input_path, data_only=True).active
    values = list(sheet.values)
    headers = values[10][:22]
    rows = []
    seen = set()
    for row_number, cells in enumerate(values[12:], 13):
        if cells[0] is None:
            continue
        raw = dict(zip(headers, cells[:22]))
        flags = []
        tx = quantity_mhz(raw["TX frequency"])
        rx = quantity_mhz(raw["RX frequency"])
        for field in ("TX frequency", "RX frequency", "Channel bandwidth", "Transmission bandwidth"):
            if raw[field] not in (None, "") and quantity_mhz(raw[field]) is None:
                flags.append("Unparsed quantity: " + field)
        center, direction = protected_frequency(tx, rx)
        channel = quantity_mhz(raw["Channel bandwidth"])
        transmission = quantity_mhz(raw["Transmission bandwidth"])
        width = effective_bandwidth(channel, transmission)
        if channel is not None and transmission is not None and abs(channel - transmission) > 1e-10:
            flags.append("Bandwidth mismatch: smaller value selected per organizer Q&A")
        if channel is None or transmission is None:
            flags.append("Incomplete bandwidth inputs")
        if center is None:
            flags.append("Missing protected frequency")
        if width is None:
            flags.append("Missing bandwidth: interval unavailable")
        if not raw["Class of licence"]:
            flags.append("Missing licence class: MUUT label applied")
        if str(raw["Station number"]) == "440557":
            flags.append("Organizer-confirmed bandwidth typo: smaller bandwidth selected per Q&A; raw values retained")
        key = json.dumps(raw, sort_keys=True, default=str)
        if key in seen:
            flags.append("Exact duplicate source row: retained")
        seen.add(key)
        height = raw["Ant height AGL (m)"]
        if isinstance(height, (int, float)) and height < 1:
            flags.append("Antenna height below 1 m: not corrected automatically")
        rows.append({"source": {"file": Path(input_path).name, "sheet": sheet.title, "row": row_number},
                     "station": str(raw["Station number"]), "licenceClass": raw["Class of licence"] or "MUUT",
                     "protectedFrequencyMHz": center, "protectedFrequencyBasis": direction,
                     "bandwidthMHz": width,
                     "lowerMHz": center - width / 2 if center is not None and width is not None else None,
                     "upperMHz": center + width / 2 if center is not None and width is not None else None,
                     "raw": raw, "flags": flags})
    return {"dataset": "Traficom synthetic frequencies of interest", "version": "normalization-v2",
            "scope": "Frequency preparation only; no interference assessment or geographic validation",
            "inputSha256": hashlib.sha256(Path(input_path).read_bytes()).hexdigest(),
            "normalizationPolicy": "Organizer Q&A: RX then TX fallback; smaller bandwidth on mismatch; MUUT for absent licence class; raw values retained",
            "recordCount": len(rows), "flaggedRecordCount": sum(bool(r["flags"]) for r in rows), "records": rows}


if __name__ == "__main__":
    result = normalize(sys.argv[1])
    output = Path(sys.argv[2])
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2, default=str))
    print(json.dumps({k: result[k] for k in ("recordCount", "flaggedRecordCount")}))