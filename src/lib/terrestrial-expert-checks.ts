import type { TerrestrialRow } from "@/lib/terrestrial-review";

/** Review prompts only. No regulatory applicability, register result or propagation is inferred. */
export function terrestrialExpertChecks(row: TerrestrialRow) {
  const provision = row.notice.raw.prov.trim();
  const cites67 = /(?:^|\D)6\s*\.\s*7(?:\D|$)/.test(provision);
  return {
    register: {
      status: "unverified" as const,
      cites67,
      reportedProvision: provision || null,
      detail: cites67
        ? "RR 6.7 is reported in the notice. Verify any claimed Finnish coordination against the Traficom Master Frequency Register; the provision alone does not confirm an agreement."
        : "No verified Finnish coordination agreement or Master Frequency Register cross-check is available in this artifact. Confirm the applicable procedure and agreement before clearance.",
    },
    licenceExempt: {
      status: "unassessed" as const,
      noExcelMatch: row.matchedFinnishRows.length === 0,
      detail:
        "M4 licence-exempt relevance has not been assessed. SRD, Wi-Fi or PMR protection may require review even without a Finnish Excel match; none is asserted to apply to this notice.",
    },
    coordination: {
      status: "unconfirmed" as const,
      selectedThresholdDbUvPerM: null,
      fieldStrengthDbUvPerM: null,
      detail:
        "Organizer Q&A selects T/R 25-08 A1.2.3 for this land-mobile challenge, including the 20 dB(µV/m) above-400 MHz reference above 470 MHz. The 12 dB(µV/m) reference applies only to 108–380 MHz. Confirm per-case applicability and power in each 25 kHz window. P.1546-6 is accepted; the optional 10 m to 3 m correction is not required. Actual-path land-border / outer territorial-sea field strength remains unresolved.",
    },
  };
}

export function terrestrialExpertLetterNotes(row: TerrestrialRow) {
  const checks = terrestrialExpertChecks(row);
  return `Coordination / national-register check: ${checks.register.detail}\n\nLicence-exempt scope: ${checks.licenceExempt.detail}\n\nCoordination reference: ${checks.coordination.detail}`;
}
