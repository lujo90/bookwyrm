from typing import Optional

from pydantic import BaseModel


class MaterialCreate(BaseModel):
    name: str
    bioink_type: str
    viscosity_mpas: Optional[float] = None
    cell_viability_pct: Optional[float] = None
    cure_method: Optional[str] = None
    regulatory_ref: Optional[str] = None
    notes: Optional[str] = None


class MaterialRead(BaseModel):
    id: int
    name: str
    bioink_type: str
    viscosity_mpas: Optional[float]
    cell_viability_pct: Optional[float]
    cure_method: Optional[str]
    regulatory_ref: Optional[str]
    notes: Optional[str]
    is_active: bool

    model_config = {"from_attributes": True}


class LayerMaterialAssignment(BaseModel):
    layer_index: int
    material_id: int
    extrusion_speed_mmps: Optional[float] = None
    pressure_kpa: Optional[float] = None


class MaterialAssignmentRequest(BaseModel):
    assignments: list[LayerMaterialAssignment]
