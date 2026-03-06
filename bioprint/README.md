# BioPrint — Backend MVP

EU-focused 3D bioprinting planning, simulation, and compliance platform.

## Quick start

```bash
cd bioprint
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn bioprint.main:app --reload
```

API docs: http://localhost:8000/docs

## Workflow

```
POST   /jobs                          # upload STL, create job
POST   /jobs/{id}/simulate-bounds     # analyse geometry
POST   /jobs/{id}/slice               # slice into layers
GET    /jobs/materials                # browse material library
POST   /jobs/{id}/materials           # assign materials to layers
POST   /jobs/{id}/validate            # EU ATMP compliance checks
GET    /jobs/{id}/consent             # generate consent document template
POST   /jobs/{id}/gcode               # generate G-code
POST   /jobs/{id}/report              # generate HTML technical report
POST   /jobs/{id}/export              # zip all artifacts + regulatory metadata
GET    /jobs/{id}/artifacts/{file}    # download individual artifact
```

## Run tests

```bash
pytest bioprint/tests/ -v
```

## Environment variables (optional)

| Variable | Default | Notes |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./bioprint.db` | Switch to `postgresql://...` for production |
| `ARTIFACT_DIR` | `./artifacts` | Local path; swap for S3 bucket prefix later |
| `DEBUG` | `false` | Enables SQL echo |

## Known shortcuts / technical debt

- **Slicer is a stub** — produces uniform bounding-box layers only
- **G-code uses a raster pattern** — no real contour/infill strategy
- **No authentication** — add OAuth2/JWT before any real users touch this
- **Compliance checks are structural** — not a substitute for regulatory review
- **Consent text is English-only** — needs i18n for EU deployment
- **JSON blobs in DB** — geometry/slice/materials stored as strings; migrate to proper columns when schemas stabilise
- **PDF reports** — not implemented; add WeasyPrint when hospitals need it
- **No async DB** — SQLModel sync sessions; fine for MVP load
