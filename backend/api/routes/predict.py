from fastapi import APIRouter, HTTPException
from typing import List
from pydantic import BaseModel

from ml.xgboost_model import predict_zones

router = APIRouter()


class WellLogInput(BaseModel):
    depths: List[float]
    GR: List[float]
    Resistivity: List[float]
    Density: List[float]
    NeutronPorosity: List[float]
    Sonic: List[float]


@router.post("/predict")
def predict_productivity(well_log: WellLogInput):
    """Run XGBoost model on well log data and return zone predictions."""
    well_log_dict = well_log.model_dump()
    try:
        result = predict_zones(well_log_dict)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(exc)}")
    return result
