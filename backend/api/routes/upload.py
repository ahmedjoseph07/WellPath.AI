from fastapi import APIRouter, UploadFile, File, HTTPException
import io

from utils.csv_parser import parse_well_log_csv

router = APIRouter()


@router.post("/upload")
async def upload_well_log(file: UploadFile = File(...)):
    """Accept a multipart CSV file, parse it, and return well log JSON."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted.")

    contents = await file.read()
    text = contents.decode("utf-8", errors="replace")

    try:
        df = parse_well_log_csv(io.StringIO(text))
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    result = {col: df[col].tolist() for col in df.columns}
    # Rename 'Depth' → 'depths' to match the frontend store and predict endpoint convention
    if "Depth" in result:
        result["depths"] = result.pop("Depth")
    return result
