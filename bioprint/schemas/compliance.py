from typing import Optional

from pydantic import BaseModel


class ComplianceCheck(BaseModel):
    check_id: str
    description: str
    passed: bool
    detail: Optional[str] = None


class ValidationResult(BaseModel):
    passed: bool
    checks: list[ComplianceCheck]
    regulation_ref: str
    warnings: list[str] = []


class ConsentSummary(BaseModel):
    job_id: int
    job_name: str
    template_version: str
    regulation_ref: str
    consent_text: str
    generated_at: str
