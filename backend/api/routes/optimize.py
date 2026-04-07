from fastapi import APIRouter, HTTPException
from typing import List, Optional
from pydantic import BaseModel

from optimization.genetic_algorithm import run_ga_optimization

router = APIRouter()


class OptimizeInput(BaseModel):
    depths: List[float]
    productivity_score: List[float]
    zone_label: List[str]
    feature_importance: dict
    # Optional GA configuration
    waypoints: Optional[int] = 8
    population: Optional[int] = 50
    generations: Optional[int] = 80
    dls_weight: Optional[float] = 0.3


@router.post("/optimize")
def optimize_trajectory(payload: OptimizeInput):
    """Run genetic algorithm trajectory optimization and return results."""
    try:
        result = run_ga_optimization(
            depths=payload.depths,
            productivity_scores=payload.productivity_score,
            n_waypoints=payload.waypoints,
            population=payload.population,
            generations=payload.generations,
            dls_weight=payload.dls_weight,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Optimization error: {str(exc)}")
    return result
