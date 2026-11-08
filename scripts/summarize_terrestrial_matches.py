"""Offline match distribution from immutable terrestrial evidence; no propagation calculation."""
import argparse
import hashlib
import json
from collections import Counter
from pathlib import Path

def summarize(path):
    raw = Path(path).read_bytes()
    data = json.loads(raw)
    records = data["records"]
    return {
        "issue": data["issue"],
        "scope": data["scope"],
        "calculationScope": "Counts of stored matchedFinnishRows only; not interference, propagation or coordination assessment.",
        "source": {"file": Path(path).name, "sha256": hashlib.sha256(raw).hexdigest()},
        "totalNotices": len(records),
        "distribution": dict(sorted(Counter(str(len(r["matchedFinnishRows"])) for r in records).items())),
        "exactlyThree": [{"id": r["notice"]["raw"]["terrakey"], "administration": r["notice"]["raw"]["adm"], "source": r["notice"]["source"]} for r in records if len(r["matchedFinnishRows"]) == 3],
    }

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    Path(args.output).write_text(json.dumps(summarize(args.input), indent=2) + "\n")