from pydantic import BaseModel


class GcodeResult(BaseModel):
    line_count: int
    estimated_print_time_s: float
    artifact_filename: str
