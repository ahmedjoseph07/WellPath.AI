from fastapi import APIRouter
from ml.synthetic_data import generate_synthetic_well_log

router = APIRouter()


@router.get("/synthetic")
def get_synthetic_data():
    """Generate and return synthetic well log data."""
    data = generate_synthetic_well_log()
    return data
