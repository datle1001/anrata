"""One RR2024 Table 21-4 limit, not a general satellite compliance engine.

Source: Volume 1, printed pp. 286-287 (PDF pp. 296-297), No. 21.16.
Applicability must be independently established; frequency overlap alone is
insufficient. No EIRP/PFD or spectral integration is performed here.
"""
import math


def gso_fss_3400_4200_limit(arrival_angle_deg, lower_mhz, upper_mhz,
                           *, applicability_confirmed=False):
    if not applicability_confirmed:
        raise ValueError("Confirm GSO FSS space-to-Earth and equal-rights applicability first")
    if not all(math.isfinite(v) for v in (arrival_angle_deg, lower_mhz, upper_mhz)):
        raise ValueError("Inputs must be finite")
    if not 0 <= arrival_angle_deg <= 90:
        raise ValueError("Arrival angle must lie between 0 and 90 degrees")
    if not 3400 <= lower_mhz <= upper_mhz <= 4200:
        raise ValueError("This criterion covers only 3400-4200 MHz")
    if arrival_angle_deg <= 5:
        limit = -152.0
    elif arrival_angle_deg < 25:
        limit = -152.0 + 0.5 * (arrival_angle_deg - 5)
    else:
        limit = -142.0
    return {"limitDbwPerM2": limit, "referenceBandwidthHz": 4000,
            "source": "RR2024 Vol.1 No.21.16 Table21-4, printed pp.286-287",
            "scope": "Applicable limit only; no candidate PFD calculated"}