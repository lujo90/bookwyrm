"""Tests for geometry_service — uses a minimal synthetic binary STL."""
import struct
import tempfile
from pathlib import Path

import pytest

from bioprint.services.geometry_service import analyse_stl, _triangle_area


def _make_binary_stl(triangles: list) -> bytes:
    """Build a minimal binary STL from a list of (normal, v1, v2, v3) tuples."""
    header = b"\x00" * 80
    count = struct.pack("<I", len(triangles))
    body = b""
    for normal, v1, v2, v3 in triangles:
        body += struct.pack("<fff", *normal)
        body += struct.pack("<fff", *v1)
        body += struct.pack("<fff", *v2)
        body += struct.pack("<fff", *v3)
        body += b"\x00\x00"  # attribute byte count
    return header + count + body


def _cube_triangles():
    """12 triangles forming a 10×10×10 mm cube at origin."""
    verts = [
        (0, 0, 0), (10, 0, 0), (10, 10, 0), (0, 10, 0),
        (0, 0, 10), (10, 0, 10), (10, 10, 10), (0, 10, 10),
    ]
    faces = [
        (0, 1, 2), (0, 2, 3),   # bottom
        (4, 6, 5), (4, 7, 6),   # top
        (0, 5, 1), (0, 4, 5),   # front
        (1, 6, 2), (1, 5, 6),   # right
        (2, 7, 3), (2, 6, 7),   # back
        (3, 4, 0), (3, 7, 4),   # left
    ]
    return [((0, 0, 0), verts[a], verts[b], verts[c]) for a, b, c in faces]


@pytest.fixture
def cube_stl(tmp_path):
    data = _make_binary_stl(_cube_triangles())
    p = tmp_path / "cube.stl"
    p.write_bytes(data)
    return p


def test_analyse_stl_bounds(cube_stl):
    result = analyse_stl(cube_stl)
    assert result.x_mm == pytest.approx(10.0, abs=0.01)
    assert result.y_mm == pytest.approx(10.0, abs=0.01)
    assert result.z_mm == pytest.approx(10.0, abs=0.01)


def test_analyse_stl_triangle_count(cube_stl):
    result = analyse_stl(cube_stl)
    assert result.triangle_count == 12


def test_analyse_stl_layer_count(cube_stl):
    result = analyse_stl(cube_stl)
    # 10 mm / 0.2 mm = 50 layers
    assert result.layer_count_estimate == 50


def test_analyse_stl_no_triangles(tmp_path):
    data = _make_binary_stl([])
    p = tmp_path / "empty.stl"
    p.write_bytes(data)
    with pytest.raises(ValueError, match="no triangles"):
        analyse_stl(p)


def test_analyse_stl_truncated(tmp_path):
    p = tmp_path / "bad.stl"
    p.write_bytes(b"\x00" * 10)
    with pytest.raises(ValueError):
        analyse_stl(p)


def test_triangle_area():
    # Right triangle with legs 3 and 4 → area = 6
    area = _triangle_area((0, 0, 0), (3, 0, 0), (0, 4, 0))
    assert area == pytest.approx(6.0, abs=0.001)
