"""Narrow T/R 25-08 A1.2.3 criterion selection; no propagation calculation.

Source: edition 6 June 2025, printed/PDF pages 6–7. Challenge extension
above 470 MHz is not a general CEPT rule. Applicability must be confirmed.
"""
import math


def coordination_criterion(lower_mhz, upper_mhz, *, applicability_confirmed=False,
                           challenge_extension_confirmed=False,
                           channel_spacing_khz=None, uniform_spectrum_confirmed=False):
    if not applicability_confirmed:
        raise ValueError("Confirm land-mobile co-channel criterion applicability first")
    if not all(math.isfinite(v) for v in (lower_mhz, upper_mhz)) or lower_mhz >= upper_mhz:
        raise ValueError("Require a finite, positive-width interval")
    bands = [(29.7, 47, 0), (47, 108, 6), (108, 380, 12), (380, 400, 18), (400, 470, 20)]
    matches = [(lo, hi, limit) for lo, hi, limit in bands if lo <= lower_mhz < upper_mhz <= hi]
    extension = False
    if len(matches) == 1:
        limit = matches[0][2]
    elif lower_mhz >= 470 and challenge_extension_confirmed:
        limit = 20
        extension = True
    else:
        raise ValueError("Interval outside one supported band; split boundary-spanning cases or confirm challenge extension")
    bandwidth_hz = 25000
    spectral_scope = "Apply within every 25 kHz window; no unverified total-channel conversion"
    if channel_spacing_khz is not None:
        if not math.isfinite(channel_spacing_khz) or channel_spacing_khz <= 0:
            raise ValueError("Channel spacing must be finite and positive")
        if channel_spacing_khz > 25:
            if not uniform_spectrum_confirmed:
                raise ValueError("Wide-channel conversion requires confirmed uniform spectral power distribution")
            limit += 10 * math.log10(channel_spacing_khz / 25)
            bandwidth_hz = channel_spacing_khz * 1000
            spectral_scope = "Total-channel criterion converted with confirmed uniform spectrum and channel spacing"
    return {"criterionDbUvPerM": limit, "referenceBandwidthHz": bandwidth_hz,
            "timePercentage": 10, "locationPercentage": 50, "receivingHeightM": 10,
            "evaluationLocation": "Border line; challenge additionally requests territorial-sea outer limit and exposed Excel stations",
            "challengeExtension": extension, "spectralScope": spectral_scope,
            "source": "T/R 25-08 edition 6 June 2025, A1.2.3, printed/PDF pp.6–7",
            "qualifications": ["Coordination trigger, not proof of harmful interference", "Footnote 2 permits 1% time in certain digital-system situations; determine separately",
                               "Propagation model validity and ERP/spectrum interpretation must be checked independently"],
            "scope": "Applicable threshold only; no field strength or case comparison calculated"}