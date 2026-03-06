"""
Bundle all job artifacts into a downloadable zip and generate regulatory metadata JSON.
"""
import json
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from bioprint.config import settings


def build_regulatory_metadata(
    job_id: int,
    job_name: str,
    geometry: dict[str, Any],
    slice_data: dict[str, Any],
    compliance: dict[str, Any],
) -> dict[str, Any]:
    """
    Produce a structured JSON document for EU ATMP technical file inclusion.
    """
    return {
        "schema_version": "1.0",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "software": "BioPrint v0.1.0",
        "regulation": settings.atmp_regulation_ref,
        "job": {
            "id": job_id,
            "name": job_name,
        },
        "geometry": {
            "x_mm": geometry.get("x_mm"),
            "y_mm": geometry.get("y_mm"),
            "z_mm": geometry.get("z_mm"),
            "volume_mm3": geometry.get("volume_mm3"),
            "triangle_count": geometry.get("triangle_count"),
        },
        "slicing": {
            "layer_height_mm": slice_data.get("layer_height_mm"),
            "layer_count": slice_data.get("layer_count"),
        },
        "compliance": {
            "passed": compliance.get("passed"),
            "regulation_ref": compliance.get("regulation_ref"),
            "checks": compliance.get("checks", []),
        },
        "disclaimer": (
            "This metadata is a documentation aid only. "
            "It does not constitute regulatory approval or replace review "
            "by a qualified Responsible Person."
        ),
    }


def write_regulatory_metadata(metadata: dict[str, Any], output_path: Path) -> None:
    output_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")


def create_export_zip(artifact_paths: list[Path], output_path: Path) -> int:
    """
    Zip all provided artifact files into output_path.
    Returns the size of the zip in bytes.
    """
    with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for p in artifact_paths:
            if p.exists():
                zf.write(p, arcname=p.name)
    return output_path.stat().st_size
