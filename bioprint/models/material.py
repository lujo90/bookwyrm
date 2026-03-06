from typing import Optional

from sqlmodel import Field, SQLModel


class Material(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str                              # e.g. "GelMA 10%"
    bioink_type: str                       # e.g. "hydrogel", "scaffold", "support"
    viscosity_mpas: Optional[float] = None
    cell_viability_pct: Optional[float] = None  # expected post-print viability %
    cure_method: Optional[str] = None     # "UV", "thermal", "ionic", etc.
    regulatory_ref: Optional[str] = None  # e.g. "ISO 10993-1"
    notes: Optional[str] = None
    is_active: bool = True
