from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from bioprint.config import settings
from bioprint.database import create_db_and_tables
from bioprint.routers import jobs, geometry, slicer, materials, compliance, gcode, report, export

_STATIC_DIR = Path(__file__).parent / "static"


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield


app = FastAPI(
    title=settings.app_name,
    description="EU-focused 3D bioprinting planning, simulation, and compliance platform.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: restrict to frontend origin before production
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(jobs.router, prefix="/jobs", tags=["Jobs"])
app.include_router(geometry.router, prefix="/jobs", tags=["Geometry"])
app.include_router(slicer.router, prefix="/jobs", tags=["Slicer"])
app.include_router(materials.router, prefix="/jobs", tags=["Materials"])
app.include_router(compliance.router, prefix="/jobs", tags=["Compliance"])
app.include_router(gcode.router, prefix="/jobs", tags=["G-code"])
app.include_router(report.router, prefix="/jobs", tags=["Report"])
app.include_router(export.router, prefix="/jobs", tags=["Export"])


@app.get("/", include_in_schema=False)
def root():
    return FileResponse(_STATIC_DIR / "index.html")


@app.get("/health", tags=["Meta"])
def health():
    return {"status": "ok", "app": settings.app_name}


app.mount("/static", StaticFiles(directory=str(_STATIC_DIR)), name="static")
