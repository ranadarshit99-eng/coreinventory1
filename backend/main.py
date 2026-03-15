from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers import auth, users, products, categories, warehouses, locations
from app.routers import receipts, deliveries, transfers, adjustments, moves, dashboard, settings
from app.seed import seed_database

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="CoreInventory API",
    description="Production-grade Inventory Management System",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(products.router, prefix="/api/products", tags=["Products"])
app.include_router(categories.router, prefix="/api/categories", tags=["Categories"])
app.include_router(warehouses.router, prefix="/api/warehouses", tags=["Warehouses"])
app.include_router(locations.router, prefix="/api/locations", tags=["Locations"])
app.include_router(receipts.router, prefix="/api/receipts", tags=["Receipts"])
app.include_router(deliveries.router, prefix="/api/deliveries", tags=["Deliveries"])
app.include_router(transfers.router, prefix="/api/transfers", tags=["Transfers"])
app.include_router(adjustments.router, prefix="/api/adjustments", tags=["Adjustments"])
app.include_router(moves.router, prefix="/api/moves", tags=["Move History"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(settings.router, prefix="/api/settings", tags=["Settings"])

@app.on_event("startup")
async def startup_event():
    seed_database()

@app.get("/api/health")
def health_check():
    return {"status": "ok", "app": "CoreInventory"}
