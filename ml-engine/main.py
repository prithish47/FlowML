"""
FlowML – ML Engine (FastAPI)
Main entry point for the Python ML microservice.
Receives pipeline definitions, executes them, and returns results.
"""

import os
import json
import shutil
import asyncio
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

from pipeline_runner import run_pipeline
from executors import EXECUTORS

app = FastAPI(
    title="FlowML ML Engine",
    description="Python microservice for executing ML pipelines",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Upload directory
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Track uploaded files
uploaded_files_registry: Dict[str, str] = {}


# ─── Models ──────────────────────────────────────────────────────────────────

class NodeData(BaseModel):
    id: str
    type: Optional[str] = "custom"
    data: Dict[str, Any] = {}
    position: Optional[Dict[str, float]] = None

class EdgeData(BaseModel):
    id: str
    source: str
    target: str
    sourceHandle: Optional[str] = None
    targetHandle: Optional[str] = None

class PipelineRequest(BaseModel):
    nodes: List[NodeData]
    edges: List[EdgeData]
    uploaded_files: Optional[Dict[str, str]] = None


# ─── Routes ──────────────────────────────────────────────────────────────────

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "flowml-ml-engine", "version": "1.0.0"}


@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Handle CSV file upload."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")

    # Check file size (5MB limit)
    contents = await file.read()
    size_mb = len(contents) / (1024 * 1024)
    if size_mb > 5:
        raise HTTPException(status_code=400, detail=f"File too large ({size_mb:.1f}MB). Max 5MB allowed on Free plan.")

    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as f:
        f.write(contents)

    file_id = file.filename
    uploaded_files_registry[file_id] = file_path

    return {
        "fileId": file_id,
        "fileName": file.filename,
        "sizeMB": round(size_mb, 2),
        "path": file_path
    }


@app.post("/execute-pipeline")
async def execute_pipeline(request: PipelineRequest):
    """Execute a complete ML pipeline."""
    nodes = [n.dict() for n in request.nodes]
    edges = [e.dict() for e in request.edges]

    # Merge uploaded files
    files = {**uploaded_files_registry}
    if request.uploaded_files:
        files.update(request.uploaded_files)

    # Validate node count (free tier: max 10)
    if len(nodes) > 10:
        raise HTTPException(
            status_code=400,
            detail=f"Free plan allows max 10 nodes. You have {len(nodes)}."
        )

    # Run pipeline
    result = await asyncio.to_thread(
        run_pipeline,
        nodes=nodes,
        edges=edges,
        executors=EXECUTORS,
        uploaded_files=files,
        timeout=30
    )

    return result


@app.get("/download-model/{model_file_id}")
async def download_model(model_file_id: str):
    """Retrieve a trained model file."""
    models_dir = os.path.join(os.path.dirname(__file__), "temp_models")
    file_path = os.path.join(models_dir, f"{model_file_id}_model.pkl")

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Model file not found")

    return FileResponse(
        path=file_path,
        filename=f"trained_model_{model_file_id}.pkl",
        media_type='application/octet-stream'
    )


@app.get("/schema")
def get_schema():
    """Return the shared pipeline schema."""
    schema_path = os.path.join(os.path.dirname(__file__), "..", "shared", "pipeline_schema.json")
    if os.path.exists(schema_path):
        with open(schema_path, "r") as f:
            return json.load(f)
    return {"error": "Schema file not found"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5001)
