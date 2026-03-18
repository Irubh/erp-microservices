# Purchase Order Management System

## Tech Stack
| Service | Technology | Port |
|---|---|---|
| Auth Service | Python FastAPI | 8001 |
| Purchase Orders | Python FastAPI | 8000 |
| Products | Python FastAPI | 8002 |
| Vendor Service | Java Spring Boot | 8003 |
| Notification | Node.js + Socket.io | 8004 |
| Frontend | HTML, CSS, JavaScript | 5500 |
| Database | PostgreSQL | 5432 |
| AI Logs | MongoDB | 27017 |

## Architecture
- OAuth 2.0 via Google Identity — no username/password
- JWT issued by auth-service, validated by all services
- Role-based access: Employee vs Vendor
- Real-time notifications via Socket.io when PO status changes
- AI-generated product descriptions via Gemini API (logged to MongoDB)

## DB Design
- `vendors` — id, name, contact, rating, email
- `products` — id, name, sku, unit_price, stock_level
- `purchase_orders` — id, reference_no, vendor_id (FK), total_amount, status
- `purchase_order_items` — id, po_id (FK), product_id (FK), quantity, unit_price_at_purchase. Junction table between POs and products. A single PO can have multiple products — this is a one-to-many relationship (one PO, many items). `unit_price_at_purchase` is stored separately from `products.unit_price` intentionally — this is a snapshot of the price when the order was made, so historical POs remain accurate even if product prices. change later.


## Users
Every user should be verified. So for the enterprise employee, anyone with @iv-innovations.com would be treated as enterprise employee and could enter as employee, others are not welcomed and for vendor, each vendor has unique email for identification. 

Therefore, no separate user_role table needed.

## Business Logic
- Total = subtotal × 1.05 (5% tax applied automatically)
- Employees create POs, vendors approve or reject them
- Vendor JWT contains vendor_id — they can only see/update their own POs

## How to Run

### 1. Start PostgreSQL and set up DB
```bash
psql -U abhishek -d erpdb -f database/schema.sql
```

### 2. Start all services
```bash
# Terminal 1 — Auth
cd backend/auth-service && source venv/bin/activate
uvicorn app.main:app --port 8001 --reload

# Terminal 2 — Purchase Orders
cd backend/purchase-orders && source venv/bin/activate
uvicorn app.main:app --port 8000 --reload

# Terminal 3 — Products
cd backend/products && source venv/bin/activate
uvicorn app.main:app --port 8002 --reload

# Terminal 4 — Vendor Service
cd backend/vendor-service
./mvnw spring-boot:run

# Terminal 5 — Notification
cd backend/notification
node server.js
```

### 3. Start frontend
Open `frontend/index.html` with VS Code Live Server (port 5500)

### 4. Environment variables needed
Each service needs a `.env` file — see `.env.example` in each folder.

## Test Accounts
- Employee: any email listed in `EMPLOYEE_EMAILS` in auth-service `.env`
- Vendor: email registered in `vendors` table in DB

## Bonus Features Implemented
- ✅ Java Spring Boot — Vendor microservice
- ✅ NoSQL (MongoDB) — stores AI description logs
- ✅ Node.js real-time notifications — Socket.io on PO status change
