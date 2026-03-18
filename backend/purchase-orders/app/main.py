from fastapi import FastAPI
from app.routes.purchase_orders_routes import router
from app.database.db import engine
from app.models.purchase_orders_model import Base
from fastapi.middleware.cors import CORSMiddleware

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5500", "http://localhost:5500"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(router, prefix="/api")

@app.get("/")
def home():
    return {"message": "purchase order Service Running"}
