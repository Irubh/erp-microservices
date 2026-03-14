from fastapi import FastAPI
from app.routes.purchase_orders_routes import router
from app.database.db import engine
from app.models.purchase_orders_model import Base

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.include_router(router, prefix="/api")

@app.get("/")
def home():
    return {"message": "purchase order Service Running"}
