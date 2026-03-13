from fastapi import FastAPI
from app.routes.product_routes import router

app = FastAPI()

app.include_router(router)

@app.get("/")
def home():
   return{"message": "Product service running"}
