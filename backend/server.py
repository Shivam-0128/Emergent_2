from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import re
import uuid
import logging
from datetime import datetime, timezone, timedelta, date as date_cls
from typing import Optional

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]

app = FastAPI()
api = APIRouter(prefix="/api")

JWT_ALGORITHM = "HS256"
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()


def verify_password(p: str, h: str) -> bool:
    return bcrypt.checkpw(p.encode(), h.encode())


def create_token(user_id: str) -> str:
    payload = {"sub": user_id, "type": "access", "exp": datetime.now(timezone.utc) + timedelta(days=30)}
    return jwt.encode(payload, os.environ["JWT_SECRET"], algorithm=JWT_ALGORITHM)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def public_user(u: dict) -> dict:
    return {"id": u["id"], "display_name": u["display_name"], "email": u["email"]}


async def current_user(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(auth[7:], os.environ["JWT_SECRET"], algorithms=[JWT_ALGORITHM])
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid or expired session")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(401, "User not found")
    return user


class SignUpIn(BaseModel):
    display_name: str = Field(min_length=1, max_length=60)
    email: EmailStr
    password: str = Field(min_length=6, max_length=200)


class SignInIn(BaseModel):
    email: EmailStr
    password: str


class HabitIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    when: str = Field(default="", max_length=2000)
    shared: bool = False


class TickIn(BaseModel):
    done: bool


class CommentIn(BaseModel):
    text: str = Field(min_length=1, max_length=2000)


@api.post("/auth/signup")
async def signup(body: SignUpIn):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "An account with this email already exists")
    user = {"id": str(uuid.uuid4()), "display_name": body.display_name.strip(), "email": email,
            "password_hash": hash_password(body.password), "created_at": now_iso()}
    await db.users.insert_one(user)
    return {"token": create_token(user["id"]), "user": public_user(user)}


@api.post("/auth/signin")
async def signin(body: SignInIn, request: Request):
    email = body.email.lower()
    ident = f"{request.client.host if request.client else ''}:{email}"
    attempt = await db.login_attempts.find_one({"identifier": ident})
    if attempt and attempt.get("count", 0) >= 5 and attempt.get("until", "") > now_iso():
        raise HTTPException(429, "Too many attempts. Try again in 15 minutes.")
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user or not verify_password(body.password, user["password_hash"]):
        count = (attempt.get("count", 0) if attempt and attempt.get("until", "") > now_iso() else 0) + 1
        until = (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()
        await db.login_attempts.update_one({"identifier": ident}, {"$set": {"count": count, "until": until}}, upsert=True)
        raise HTTPException(401, "Incorrect email or password")
    await db.login_attempts.delete_one({"identifier": ident})
    return {"token": create_token(user["id"]), "user": public_user(user)}


@api.get("/auth/me")
async def me(user: dict = Depends(current_user)):
    return public_user(user)


def compute_stats(dates: list) -> dict:
    days = sorted({date_cls.fromisoformat(d) for d in dates}, reverse=True)
    streak = 0
    if days:
        streak = 1
        for prev, cur in zip(days, days[1:]):
            if (prev - cur).days == 1:
                streak += 1
            else:
                break
    return {"days_done": len(days), "current_streak": streak}


async def habit_out(h: dict, include_dates: bool = False) -> dict:
    ticks = await db.ticks.find({"habit_id": h["id"]}, {"_id": 0, "date": 1}).to_list(10000)
    dates = [t["date"] for t in ticks]
    owner = await db.users.find_one({"id": h["user_id"]}, {"_id": 0, "display_name": 1})
    out = {"id": h["id"], "name": h["name"], "when": h["when"], "shared": h["shared"],
           "owner_id": h["user_id"], "owner_name": owner["display_name"] if owner else "Unknown",
           "created_at": h["created_at"], **compute_stats(dates)}
    if include_dates:
        out["done_dates"] = sorted(dates)
    return out


async def get_visible_habit(habit_id: str, user: dict) -> dict:
    h = await db.habits.find_one({"id": habit_id}, {"_id": 0})
    if not h or (h["user_id"] != user["id"] and not h["shared"]):
        raise HTTPException(404, "Habit not found")
    return h


@api.get("/habits/mine")
async def my_habits(user: dict = Depends(current_user)):
    habits = await db.habits.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [await habit_out(h) for h in habits]


@api.post("/habits")
async def add_habit(body: HabitIn, user: dict = Depends(current_user)):
    h = {"id": str(uuid.uuid4()), "user_id": user["id"], "name": body.name.strip(), "when": body.when.strip(),
         "shared": body.shared, "created_at": now_iso()}
    await db.habits.insert_one(h)
    return await habit_out(h)


@api.get("/habits/community")
async def community(user: dict = Depends(current_user)):
    habits = await db.habits.find({"shared": True}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [await habit_out(h) for h in habits]


@api.get("/habits/{habit_id}")
async def get_habit(habit_id: str, user: dict = Depends(current_user)):
    h = await get_visible_habit(habit_id, user)
    return await habit_out(h, include_dates=True)


@api.put("/habits/{habit_id}/ticks/{day}")
async def set_tick(habit_id: str, day: str, body: TickIn, user: dict = Depends(current_user)):
    h = await get_visible_habit(habit_id, user)
    if h["user_id"] != user["id"]:
        raise HTTPException(403, "Only the owner can change this habit")
    if not DATE_RE.match(day):
        raise HTTPException(400, "Invalid date")
    try:
        date_cls.fromisoformat(day)
    except ValueError:
        raise HTTPException(400, "Invalid date")
    if body.done:
        await db.ticks.update_one({"habit_id": habit_id, "date": day},
                                  {"$setOnInsert": {"habit_id": habit_id, "date": day}}, upsert=True)
    else:
        await db.ticks.delete_one({"habit_id": habit_id, "date": day})
    return await habit_out(h, include_dates=True)


@api.get("/habits/{habit_id}/comments")
async def list_comments(habit_id: str, user: dict = Depends(current_user)):
    await get_visible_habit(habit_id, user)
    return await db.comments.find({"habit_id": habit_id}, {"_id": 0}).sort("created_at", 1).to_list(5000)


@api.post("/habits/{habit_id}/comments")
async def add_comment(habit_id: str, body: CommentIn, user: dict = Depends(current_user)):
    await get_visible_habit(habit_id, user)
    text = body.text.strip()
    if not text:
        raise HTTPException(400, "Comment cannot be empty")
    c = {"id": str(uuid.uuid4()), "habit_id": habit_id, "user_id": user["id"],
         "author_name": user["display_name"], "text": text, "created_at": now_iso()}
    await db.comments.insert_one(c)
    c.pop("_id", None)
    return c


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.habits.create_index("id", unique=True)
    await db.ticks.create_index([("habit_id", 1), ("date", 1)], unique=True)
    await db.comments.create_index("habit_id")
    await db.login_attempts.create_index("identifier")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
