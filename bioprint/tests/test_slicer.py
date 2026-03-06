from bioprint.services.slicer_service import apply_material_assignments, slice_geometry


def _geometry(z=10.0):
    return {"x_mm": 20.0, "y_mm": 15.0, "z_mm": z}


def test_layer_count():
    result = slice_geometry(_geometry(z=10.0), layer_height_mm=0.2)
    assert result["layer_count"] == 50


def test_layer_count_rounds():
    # 1.0 / 0.3 = 3.33... → rounds to 3
    result = slice_geometry(_geometry(z=1.0), layer_height_mm=0.3)
    assert result["layer_count"] == 3


def test_layer_height_stored():
    result = slice_geometry(_geometry(), layer_height_mm=0.5)
    assert result["layer_height_mm"] == 0.5


def test_layers_list_length():
    result = slice_geometry(_geometry(z=1.0), layer_height_mm=0.2)
    assert len(result["layers"]) == result["layer_count"]


def test_layer_z_values():
    result = slice_geometry(_geometry(z=1.0), layer_height_mm=0.5)
    layers = result["layers"]
    assert layers[0]["z_bottom_mm"] == 0.0
    assert layers[0]["z_top_mm"] == 0.5
    assert layers[1]["z_bottom_mm"] == 0.5


def test_apply_material_assignments():
    slice_data = slice_geometry(_geometry(z=1.0), layer_height_mm=0.5)
    assignments = [
        {"layer_index": 0, "material_id": 1, "extrusion_speed_mmps": 15.0, "pressure_kpa": None},
        {"layer_index": 1, "material_id": 2, "extrusion_speed_mmps": None, "pressure_kpa": 80.0},
    ]
    updated = apply_material_assignments(slice_data, assignments)
    assert updated["layers"][0]["material_id"] == 1
    assert updated["layers"][0]["extrusion_speed_mmps"] == 15.0
    assert updated["layers"][1]["material_id"] == 2
    assert updated["layers"][1]["pressure_kpa"] == 80.0


def test_unassigned_layers_remain_none():
    slice_data = slice_geometry(_geometry(z=1.0), layer_height_mm=0.5)
    updated = apply_material_assignments(slice_data, [])
    assert all(l["material_id"] is None for l in updated["layers"])
