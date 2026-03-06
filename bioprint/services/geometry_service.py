"""
Parse an STL file and return bounding box, volume estimate, and layer count.

TECH DEBT: Uses a pure-Python binary STL parser to avoid numpy-stl as a dep.
           Surface area is approximated from triangle normals — not exact.
           Replace with numpy-stl + proper mesh validation before clinical use.
"""
import struct
from pathlib import Path

from bioprint.schemas.geometry import BoundsResult

_DEFAULT_LAYER_HEIGHT_MM = 0.2


def analyse_stl(path: Path) -> BoundsResult:
    triangles = _parse_stl_binary(path)
    if not triangles:
        raise ValueError("STL file contains no triangles or is not binary STL.")

    xs, ys, zs = [], [], []
    surface_area = 0.0

    for normal, v1, v2, v3 in triangles:
        for v in (v1, v2, v3):
            xs.append(v[0])
            ys.append(v[1])
            zs.append(v[2])
        surface_area += _triangle_area(v1, v2, v3)

    x_mm = max(xs) - min(xs)
    y_mm = max(ys) - min(ys)
    z_mm = max(zs) - min(zs)

    # Rough bounding-box volume — real mesh volume needs signed tetrahedra method
    volume_mm3 = x_mm * y_mm * z_mm * 0.5  # heuristic correction for typical shapes

    layer_count = max(1, round(z_mm / _DEFAULT_LAYER_HEIGHT_MM))

    warnings = []
    if x_mm > 150 or y_mm > 150:
        warnings.append("Model XY footprint exceeds 150 mm — verify printer bed size.")
    if z_mm > 100:
        warnings.append("Model height exceeds 100 mm — long print time expected.")
    if len(triangles) > 500_000:
        warnings.append("High triangle count — consider decimating the mesh.")

    return BoundsResult(
        x_mm=round(x_mm, 3),
        y_mm=round(y_mm, 3),
        z_mm=round(z_mm, 3),
        volume_mm3=round(volume_mm3, 3),
        surface_area_mm2=round(surface_area, 3),
        triangle_count=len(triangles),
        layer_count_estimate=layer_count,
        warnings=warnings,
    )


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _parse_stl_binary(path: Path):
    """Return list of (normal, v1, v2, v3) tuples from a binary STL."""
    data = path.read_bytes()
    if len(data) < 84:
        raise ValueError("File too small to be a valid binary STL.")
    triangle_count = struct.unpack_from("<I", data, 80)[0]
    expected_size = 84 + triangle_count * 50
    if len(data) < expected_size:
        raise ValueError("Binary STL file is truncated.")

    triangles = []
    offset = 84
    for _ in range(triangle_count):
        normal = struct.unpack_from("<fff", data, offset)
        v1 = struct.unpack_from("<fff", data, offset + 12)
        v2 = struct.unpack_from("<fff", data, offset + 24)
        v3 = struct.unpack_from("<fff", data, offset + 36)
        triangles.append((normal, v1, v2, v3))
        offset += 50
    return triangles


def _triangle_area(v1, v2, v3) -> float:
    ax, ay, az = v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]
    bx, by, bz = v3[0] - v1[0], v3[1] - v1[1], v3[2] - v1[2]
    cx = ay * bz - az * by
    cy = az * bx - ax * bz
    cz = ax * by - ay * bx
    return 0.5 * (cx**2 + cy**2 + cz**2) ** 0.5
