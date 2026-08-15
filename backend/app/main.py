from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers import auth, documents, ocr, admin, billing

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Makhtout API",
    description="API de reconnaissance de manuscrits arabes/français",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
app.include_router(ocr.router, prefix="/api/ocr", tags=["ocr"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(billing.router, prefix="/api/billing", tags=["billing"])


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "makhtout-api"}
