from sqlmodel import Session, select

from bioprint.models.material import Material
from bioprint.schemas.material import MaterialCreate, MaterialRead

# Seed data for the material library — loaded on first startup
SEED_MATERIALS = [
    {
        "name": "GelMA 10%",
        "bioink_type": "hydrogel",
        "viscosity_mpas": 450.0,
        "cell_viability_pct": 92.0,
        "cure_method": "UV",
        "regulatory_ref": "ISO 10993-1",
        "notes": "General-purpose cell-laden hydrogel.",
    },
    {
        "name": "Alginate-Collagen",
        "bioink_type": "hydrogel",
        "viscosity_mpas": 320.0,
        "cell_viability_pct": 88.0,
        "cure_method": "ionic",
        "regulatory_ref": "ISO 10993-1",
        "notes": "Good for vascular scaffolds.",
    },
    {
        "name": "PCL Support",
        "bioink_type": "support",
        "viscosity_mpas": None,
        "cell_viability_pct": None,
        "cure_method": "thermal",
        "regulatory_ref": "ISO 10993-1",
        "notes": "Sacrificial support structure material.",
    },
]


def seed_materials(session: Session) -> None:
    existing = session.exec(select(Material)).first()
    if existing:
        return
    for m in SEED_MATERIALS:
        session.add(Material(**m))
    session.commit()


def list_materials(session: Session, bioink_type: str | None = None) -> list[MaterialRead]:
    query = select(Material).where(Material.is_active == True)
    if bioink_type:
        query = query.where(Material.bioink_type == bioink_type)
    results = session.exec(query).all()
    return [MaterialRead.model_validate(r) for r in results]


def get_material(session: Session, material_id: int) -> Material:
    m = session.get(Material, material_id)
    if not m:
        raise ValueError(f"Material {material_id} not found.")
    return m


def create_material(session: Session, data: MaterialCreate) -> MaterialRead:
    m = Material(**data.model_dump())
    session.add(m)
    session.commit()
    session.refresh(m)
    return MaterialRead.model_validate(m)


def validate_assignments(session: Session, assignments: list[dict]) -> list[str]:
    """Return a list of warning strings for problematic assignments."""
    warnings = []
    seen_ids = set()
    for a in assignments:
        mid = a["material_id"]
        if mid in seen_ids:
            continue
        seen_ids.add(mid)
        try:
            m = get_material(session, mid)
        except ValueError:
            warnings.append(f"Material ID {mid} does not exist.")
            continue
        if m.cell_viability_pct is not None and m.cell_viability_pct < 80:
            warnings.append(
                f"Material '{m.name}' has low expected cell viability ({m.cell_viability_pct}%)."
            )
    return warnings
