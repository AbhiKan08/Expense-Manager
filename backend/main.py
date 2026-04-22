import os, uuid, json
from datetime import datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, String, Float, Text
from sqlalchemy.orm import declarative_base, sessionmaker
from pydantic import BaseModel
from typing import Optional

# ── Database ──────────────────────────────────────────────────────────────────
SQLITE_PATH = os.getenv("SQLITE_PATH", "data/expenses.db")
os.makedirs(os.path.dirname(SQLITE_PATH) or ".", exist_ok=True)
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{SQLITE_PATH}")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()


class TxRow(Base):
    __tablename__ = "transactions"
    id          = Column(String, primary_key=True)
    type        = Column(String, nullable=False)
    amount      = Column(Float,  nullable=False)
    date        = Column(String, nullable=False)
    category    = Column(String, nullable=False)
    sub_category= Column(String, default="")
    notes       = Column(Text,   default="")
    created_at  = Column(String)


class SettingRow(Base):
    __tablename__ = "settings"
    key   = Column(String, primary_key=True)
    value = Column(Text)


Base.metadata.create_all(bind=engine)

# ── Defaults ──────────────────────────────────────────────────────────────────
DEFAULT_CATEGORIES = {
    "debit": [
        "Food","Travel","Bills","Family","Family 2","Smokes","Chill Travel",
        "Miscellaneous","Loan Repayment","Donation","Grooming","Car",
        "Bank Charges","Laptop/Phone","Health & Wellness","Drinks","Groceries",
        "Taxes","Home","Home 2","Gifts","Events","House - Reimbursable","Other",
    ],
    "credit": ["Salary","Tax refund","Refund","Income - Investments","Other Income","Cashback"],
    "investment": ["Investment"],
    "selfTransfer": ["Repayment By A Friend","Within Own Accounts"],
}

DEFAULT_SUBCATEGORIES = sorted([
    "Barber","Bodycare","Books","Clothes","Cook","Donation","Drinks",
    "Electricity","Family","Family Travel","Fitness Coaching","Food","Footwear",
    "Gas - Cooking","Groceries","Home Setup/Repair","Insurance - Health",
    "Insurance - Scooty","Insurance - Term","Interest - Bank",
    "Investment - Crypto","Investment - FD","Investment - Mutual Funds",
    "Investment - RD","Investment - Stocks","Laptop","Laptop Accessories",
    "Laundry","Loan Repayment - Home","Maid","Medical","Other Subscriptions",
    "Phone","Phone Accessories","Phone Recharge","Phone Recharge - Family",
    "Rent - House","Rewards - CC","Scent","Service - Car","Smokes","Snacks",
    "Souvenirs","Sports","Stay","Tanu","Transport","Watches","Wifi","Wifi - Family",
])

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="Expense Manager API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Schemas ───────────────────────────────────────────────────────────────────
class TxIn(BaseModel):
    id:          Optional[str]   = None
    type:        str
    amount:      float
    date:        str
    category:    str
    subCategory: str             = ""
    notes:       str             = ""
    createdAt:   Optional[str]   = None


class TxPatch(BaseModel):
    amount:      Optional[float] = None
    date:        Optional[str]   = None
    category:    Optional[str]   = None
    subCategory: Optional[str]   = None
    notes:       Optional[str]   = None


def to_dict(r: TxRow) -> dict:
    return {
        "id": r.id, "type": r.type, "amount": r.amount, "date": r.date,
        "category": r.category, "subCategory": r.sub_category,
        "notes": r.notes, "createdAt": r.created_at,
    }

# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/api/transactions")
def list_transactions():
    s = SessionLocal()
    rows = s.query(TxRow).order_by(TxRow.created_at.desc()).all()
    s.close()
    return [to_dict(r) for r in rows]


@app.post("/api/transactions", status_code=201)
def create_transaction(tx: TxIn):
    s = SessionLocal()
    row = TxRow(
        id=tx.id or str(uuid.uuid4()),
        type=tx.type, amount=tx.amount, date=tx.date,
        category=tx.category, sub_category=tx.subCategory, notes=tx.notes,
        created_at=tx.createdAt or datetime.utcnow().isoformat(),
    )
    s.add(row); s.commit(); s.refresh(row)
    result = to_dict(row)
    s.close()
    return result


@app.put("/api/transactions/{tx_id}")
def update_transaction(tx_id: str, tx: TxPatch):
    s = SessionLocal()
    row = s.query(TxRow).filter(TxRow.id == tx_id).first()
    if not row: s.close(); raise HTTPException(404, "Not found")
    if tx.amount      is not None: row.amount       = tx.amount
    if tx.date        is not None: row.date         = tx.date
    if tx.category    is not None: row.category     = tx.category
    if tx.subCategory is not None: row.sub_category = tx.subCategory
    if tx.notes       is not None: row.notes        = tx.notes
    s.commit(); s.close()
    return {"ok": True}


@app.delete("/api/transactions/{tx_id}")
def delete_transaction(tx_id: str):
    s = SessionLocal()
    row = s.query(TxRow).filter(TxRow.id == tx_id).first()
    if not row: s.close(); raise HTTPException(404, "Not found")
    s.delete(row); s.commit(); s.close()
    return {"ok": True}


@app.get("/api/settings")
def get_settings():
    s = SessionLocal()
    cats = s.query(SettingRow).filter(SettingRow.key == "categories").first()
    subs = s.query(SettingRow).filter(SettingRow.key == "subcategories").first()
    s.close()
    return {
        "categories":    json.loads(cats.value) if cats else DEFAULT_CATEGORIES,
        "subcategories": json.loads(subs.value) if subs else DEFAULT_SUBCATEGORIES,
    }


@app.put("/api/settings")
def update_settings(data: dict):
    s = SessionLocal()
    for key in ("categories", "subcategories"):
        if key not in data:
            continue
        row = s.query(SettingRow).filter(SettingRow.key == key).first()
        if row:
            row.value = json.dumps(data[key])
        else:
            s.add(SettingRow(key=key, value=json.dumps(data[key])))
    s.commit(); s.close()
    return {"ok": True}


@app.get("/health")
def health():
    return {"status": "ok"}
