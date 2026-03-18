import psycopg2
import psycopg2.extras
import os
from dotenv import load_dotenv

load_dotenv()

def get_connection():
    """Returns a new PostgreSQL connection."""
    return psycopg2.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD")
    )

def find_vendor_by_email(email: str):
    """
    Look up vendor table by email.
    Returns vendor row as dict or None.
    """
    conn = get_connection()
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(
            "SELECT id, name, email FROM vendors WHERE email = %s",
            (email,)
        )
        vendor = cur.fetchone()
        return dict(vendor) if vendor else None
    except Exception as e:
        print(f"[DB ERROR] find_vendor_by_email: {e}")
        return None
    finally:
        cur.close()
        conn.close()