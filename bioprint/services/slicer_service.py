"""
Stub slicer: produces uniform horizontal layers from bounding-box geometry.

TECH DEBT: This is a placeholder. Real bioprint slicing needs:
  - Proper mesh cross-section computation (Shapely + numpy-stl, or CuraEngine)
  - Infill pattern generation (grid, gyroid, honeycomb)
  - Support structure detection
  - Per-layer contour paths

For the MVP this gives enough layer structure to drive material assignment
and G-code generation without a heavy dependency.
"""
import json
from typing import Any

_DEFAULT_LAYER_HEIGHT_MM = 0.2
_DEFAULT_INFILL_PCT = 80


def slice_geometry(geometry: dict[str, Any], layer_height_mm: float = _DEFAULT_LAYER_HEIGHT_MM) -> dict[str, Any]:
    """
    Generate a layer list from pre-computed geometry bounds.

    Args:
        geometry: BoundsResult dict (from geometry_service.analyse_stl)
        layer_height_mm: desired layer height in mm

    Returns:
        dict with keys: layer_height_mm, layer_count, layers (list of layer dicts)
    """
    z_mm: float = geometry["z_mm"]
    x_mm: float = geometry["x_mm"]
    y_mm: float = geometry["y_mm"]

    layer_count = max(1, round(z_mm / layer_height_mm))

    layers = []
    for i in range(layer_count):
        z_bottom = round(i * layer_height_mm, 4)
        z_top = round(z_bottom + layer_height_mm, 4)
        layers.append({
            "index": i,
            "z_bottom_mm": z_bottom,
            "z_top_mm": z_top,
            "width_mm": x_mm,
            "depth_mm": y_mm,
            "infill_pct": _DEFAULT_INFILL_PCT,
            "material_id": None,         # filled in by material_service
            "extrusion_speed_mmps": None,
            "pressure_kpa": None,
        })

    return {
        "layer_height_mm": layer_height_mm,
        "layer_count": layer_count,
        "layers": layers,
    }


def apply_material_assignments(slice_data: dict[str, Any], assignments: list[dict]) -> dict[str, Any]:
    """Merge material assignments into the layer list."""
    assignment_map = {a["layer_index"]: a for a in assignments}
    for layer in slice_data["layers"]:
        idx = layer["index"]
        if idx in assignment_map:
            a = assignment_map[idx]
            layer["material_id"] = a["material_id"]
            layer["extrusion_speed_mmps"] = a.get("extrusion_speed_mmps")
            layer["pressure_kpa"] = a.get("pressure_kpa")
    return slice_data
