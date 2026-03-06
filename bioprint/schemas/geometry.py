from pydantic import BaseModel


class BoundsResult(BaseModel):
    x_mm: float
    y_mm: float
    z_mm: float
    volume_mm3: float
    surface_area_mm2: float
    triangle_count: int
    layer_count_estimate: int     # z_mm / default layer height
    warnings: list[str] = []
