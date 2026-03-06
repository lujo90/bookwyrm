# Import all models so SQLModel can discover them for table creation
from bioprint.models.job import PrintJob, JobStatus  # noqa: F401
from bioprint.models.material import Material  # noqa: F401
from bioprint.models.artifact import Artifact, ArtifactKind  # noqa: F401
