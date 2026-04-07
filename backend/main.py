from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import synthetic, upload, predict, optimize

app = FastAPI(
    title="WellPath.AI API",
    description="AI-driven wellbore trajectory optimization backend",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(synthetic.router, prefix="/api")
app.include_router(upload.router, prefix="/api")
app.include_router(predict.router, prefix="/api")
app.include_router(optimize.router, prefix="/api")


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "WellPath.AI Backend"}
