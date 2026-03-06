from bioprint.services.compliance_service import generate_consent_summary, validate_job
from bioprint.services.slicer_service import apply_material_assignments, slice_geometry


def _geometry():
    return {"x_mm": 20.0, "y_mm": 15.0, "z_mm": 5.0}


def _slice(z=5.0):
    return slice_geometry({"x_mm": 20.0, "y_mm": 15.0, "z_mm": z}, layer_height_mm=0.5)


def _assigned_slice():
    s = _slice()
    assignments = [{"layer_index": i, "material_id": 1} for i in range(s["layer_count"])]
    return apply_material_assignments(s, assignments)


def test_validate_passes_when_all_assigned():
    result = validate_job("TestJob", _geometry(), _assigned_slice(), "[]")
    # All structural checks should pass
    geo_check = next(c for c in result.checks if c.check_id == "GEO_001")
    mat_check = next(c for c in result.checks if c.check_id == "MAT_001")
    assert geo_check.passed is True
    assert mat_check.passed is True


def test_validate_fails_mat001_when_unassigned():
    result = validate_job("TestJob", _geometry(), _slice(), None)
    mat_check = next(c for c in result.checks if c.check_id == "MAT_001")
    assert mat_check.passed is False
    assert result.passed is False


def test_validate_fails_geo001_for_oversized():
    big_geo = {"x_mm": 300.0, "y_mm": 300.0, "z_mm": 5.0}
    s = slice_geometry(big_geo, layer_height_mm=0.5)
    assignments = [{"layer_index": i, "material_id": 1} for i in range(s["layer_count"])]
    s = apply_material_assignments(s, assignments)
    result = validate_job("BigJob", big_geo, s, "[]")
    geo_check = next(c for c in result.checks if c.check_id == "GEO_001")
    assert geo_check.passed is False


def test_consent_text_contains_job_name():
    summary = generate_consent_summary(42, "Liver Scaffold A")
    assert "Liver Scaffold A" in summary.consent_text
    assert "42" in summary.consent_text


def test_consent_has_disclaimer():
    summary = generate_consent_summary(1, "Test")
    assert "TEMPLATE MUST BE REVIEWED" in summary.consent_text


def test_validate_always_includes_disclaimer_warning():
    result = validate_job("X", _geometry(), _assigned_slice(), "[]")
    assert any("documentation aid" in w for w in result.warnings)
