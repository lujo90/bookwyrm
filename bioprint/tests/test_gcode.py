from pathlib import Path

from bioprint.services.gcode_service import generate_gcode
from bioprint.services.slicer_service import apply_material_assignments, slice_geometry


def _slice_with_materials(z=2.0, layer_height=0.5):
    geometry = {"x_mm": 10.0, "y_mm": 10.0, "z_mm": z}
    s = slice_geometry(geometry, layer_height_mm=layer_height)
    assignments = [{"layer_index": i, "material_id": 1} for i in range(s["layer_count"])]
    return apply_material_assignments(s, assignments)


def test_gcode_file_created(tmp_path):
    s = _slice_with_materials()
    out = tmp_path / "test.gcode"
    generate_gcode(s, out)
    assert out.exists()
    assert out.stat().st_size > 0


def test_gcode_has_header(tmp_path):
    s = _slice_with_materials()
    out = tmp_path / "test.gcode"
    generate_gcode(s, out)
    content = out.read_text()
    assert "BioPrint generated G-code" in content
    assert "G28" in content  # home


def test_gcode_has_footer(tmp_path):
    s = _slice_with_materials()
    out = tmp_path / "test.gcode"
    generate_gcode(s, out)
    content = out.read_text()
    assert "END OF PRINT" in content
    assert "M84" in content  # disable motors


def test_gcode_returns_metadata(tmp_path):
    s = _slice_with_materials(z=2.0, layer_height=1.0)
    out = tmp_path / "test.gcode"
    meta = generate_gcode(s, out)
    assert meta["line_count"] > 0
    assert meta["estimated_print_time_s"] >= 0
    assert meta["artifact_filename"] == "test.gcode"


def test_gcode_has_layer_comments(tmp_path):
    s = _slice_with_materials(z=2.0, layer_height=1.0)
    out = tmp_path / "test.gcode"
    generate_gcode(s, out)
    content = out.read_text()
    assert "; Layer 0" in content
    assert "; Layer 1" in content
