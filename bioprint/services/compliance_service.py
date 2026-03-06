"""
EU ATMP compliance checks and consent summary generation.

IMPORTANT: This module generates documentation *aids* only.
It does NOT constitute legal advice or replace institutional ethics review.
All output must be reviewed by a qualified Responsible Person before use.
"""
from datetime import datetime, timezone
from typing import Any

from bioprint.config import settings
from bioprint.schemas.compliance import ComplianceCheck, ConsentSummary, ValidationResult


def validate_job(job_name: str, geometry: dict, slice_data: dict, materials_json: str | None) -> ValidationResult:
    """
    Run a set of placeholder EU ATMP compliance checks.

    TECH DEBT: These are structural checks only. Real ATMP validation requires:
    - Sterility assurance documentation
    - QP release sign-off
    - Batch record traceability
    - Competent authority notification (EMA / national CA)
    """
    checks: list[ComplianceCheck] = []

    # 1. Model bounds within safe print envelope
    x, y, z = geometry.get("x_mm", 0), geometry.get("y_mm", 0), geometry.get("z_mm", 0)
    in_envelope = x <= 200 and y <= 200 and z <= 150
    checks.append(ComplianceCheck(
        check_id="GEO_001",
        description="Model dimensions within safe print envelope (200×200×150 mm)",
        passed=in_envelope,
        detail=f"Dimensions: {x}×{y}×{z} mm" if not in_envelope else None,
    ))

    # 2. All layers have a material assigned
    layers = slice_data.get("layers", [])
    unassigned = [l["index"] for l in layers if l.get("material_id") is None]
    all_assigned = len(unassigned) == 0
    checks.append(ComplianceCheck(
        check_id="MAT_001",
        description="All layers have a material assigned",
        passed=all_assigned,
        detail=f"Unassigned layers: {unassigned[:10]}{'…' if len(unassigned) > 10 else ''}" if not all_assigned else None,
    ))

    # 3. Minimum layer count (structural integrity heuristic)
    layer_count = slice_data.get("layer_count", 0)
    enough_layers = layer_count >= 3
    checks.append(ComplianceCheck(
        check_id="GEO_002",
        description="Minimum layer count ≥ 3 for structural integrity",
        passed=enough_layers,
        detail=f"Layer count: {layer_count}" if not enough_layers else None,
    ))

    # 4. Materials list present
    has_materials = materials_json is not None
    checks.append(ComplianceCheck(
        check_id="MAT_002",
        description="Material assignment record present",
        passed=has_materials,
    ))

    # 5. Regulation reference placeholder
    checks.append(ComplianceCheck(
        check_id="REG_001",
        description=f"Regulatory framework reference recorded ({settings.atmp_regulation_ref})",
        passed=True,
        detail="Manual verification by Responsible Person required before submission.",
    ))

    overall = all(c.passed for c in checks)
    warnings = []
    if not overall:
        warnings.append(
            "One or more compliance checks failed. Resolve issues before generating regulatory documentation."
        )
    warnings.append(
        "DISCLAIMER: This validation is a documentation aid only and does not constitute regulatory approval."
    )

    return ValidationResult(
        passed=overall,
        checks=checks,
        regulation_ref=settings.atmp_regulation_ref,
        warnings=warnings,
    )


def generate_consent_summary(job_id: int, job_name: str) -> ConsentSummary:
    """
    Generate a plain-language consent document template.

    TECH DEBT: Template text is English-only. Add i18n (DE, FR, NL, ES…) before
    deploying in non-English-speaking EU hospitals.
    """
    now = datetime.now(timezone.utc).isoformat()
    consent_text = f"""
PATIENT / PARTICIPANT INFORMATION AND CONSENT FORM
(Documentation Aid — for institutional adaptation only)

Project: {job_name}
Date generated: {now}
Regulatory framework: {settings.atmp_regulation_ref}
Template version: {settings.consent_template_version}

---

1. PURPOSE
This document summarises the 3D bioprinting procedure planned for your treatment
or research participation. The construct has been designed using BioPrint software
in compliance with EU ATMP Regulation (EC) No 1394/2007.

2. WHAT WILL HAPPEN
A three-dimensional biological construct will be fabricated using biocompatible
materials and, where applicable, your own cells or donor cells. The process is
planned and simulated digitally before any physical printing takes place.

3. MATERIALS USED
The bioinks and scaffold materials used in this procedure are documented in the
accompanying Technical File (job ID: {job_id}). All materials carry relevant
ISO 10993-1 biocompatibility references where applicable.

4. RISKS AND BENEFITS
Your treating clinician or principal investigator will explain the specific risks
and anticipated benefits relevant to your case. This document does not replace
that conversation.

5. YOUR RIGHTS
You may withdraw consent at any time without giving a reason and without affecting
the quality of your care. Contact your treating team for further information.

6. DATA AND AUDITABILITY
Records of this procedure, including the digital model and print parameters, are
retained in accordance with applicable EU data protection law (GDPR) and
institutional policy.

---
Participant signature: ____________________  Date: __________

Clinician / PI signature: _________________  Date: __________

[THIS TEMPLATE MUST BE REVIEWED AND ADAPTED BY YOUR INSTITUTION'S LEGAL AND
ETHICS TEAM BEFORE USE WITH PARTICIPANTS.]
""".strip()

    return ConsentSummary(
        job_id=job_id,
        job_name=job_name,
        template_version=settings.consent_template_version,
        regulation_ref=settings.atmp_regulation_ref,
        consent_text=consent_text,
        generated_at=now,
    )
