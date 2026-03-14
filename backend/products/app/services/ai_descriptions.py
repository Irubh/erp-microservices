from dotenv import load_dotenv
from app.services.mongo_client import collection
import google.generativeai as genai
import os

load_dotenv()

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

model = genai.GenerativeModel("gemini-2.5-flash")


def generate_product_description(product_name: str):

    prompt = f"""
    Write a professional 2 sentence marketing description 
    for a product called: {product_name}.

    Make it sound suitable for a business catalog.
    """

    response = model.generate_content(prompt)
    description = response.text
    
    log = {
        "product_name": product_name,
        "description": description,
        "prompt": prompt,
        "response_raw": response.to_dict(), 
    }
    collection.insert_one(log)

    return description