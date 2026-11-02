# Habit Circle API regression tests: auth, habits, ticks/streak, community, comments, permissions
import os
import uuid
from datetime import date, timedelta

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"


def signup(name):
    email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    r = requests.post(f"{API}/auth/signup", json={"display_name": name, "email": email, "password": "pass1234"})
    assert r.status_code == 200, r.text
    d = r.json()
    return {"email": email, "token": d["token"], "user": d["user"], "h": {"Authorization": f"Bearer {d['token']}"}}


@pytest.fixture(scope="module")
def u1():
    return signup("TEST_Owner")


@pytest.fixture(scope="module")
def u2():
    return signup("TEST_Other")


# Auth
class TestAuth:
    def test_signin_alice(self):
        r = requests.post(f"{API}/auth/signin", json={"email": "alice@example.com", "password": "alice123"})
        assert r.status_code == 200
        assert r.json()["user"]["email"] == "alice@example.com"

    def test_signin_bob(self):
        r = requests.post(f"{API}/auth/signin", json={"email": "bob@example.com", "password": "bob12345"})
        assert r.status_code == 200

    def test_signup_duplicate(self, u1):
        r = requests.post(f"{API}/auth/signup", json={"display_name": "x", "email": u1["email"], "password": "pass1234"})
        assert r.status_code == 400

    def test_wrong_password(self, u1):
        r = requests.post(f"{API}/auth/signin", json={"email": u1["email"], "password": "wrongpass"})
        assert r.status_code == 401
        assert "Incorrect" in r.json()["detail"]

    def test_me(self, u1):
        r = requests.get(f"{API}/auth/me", headers=u1["h"])
        assert r.status_code == 200 and r.json()["display_name"] == "TEST_Owner"
        assert "password_hash" not in r.json()

    def test_unauth(self):
        assert requests.get(f"{API}/habits/mine").status_code == 401

    def test_lockout(self):
        u = signup("TEST_Lock")
        codes = [requests.post(f"{API}/auth/signin", json={"email": u["email"], "password": "bad"}).status_code for _ in range(6)]
        assert codes[:5] == [401] * 5
        assert codes[5] == 429
        # even correct password locked
        r = requests.post(f"{API}/auth/signin", json={"email": u["email"], "password": "pass1234"})
        assert r.status_code == 429


# Habits + ticks + community + comments
class TestHabits:
    def test_full_flow(self, u1, u2):
        priv = requests.post(f"{API}/habits", json={"name": "TEST_private", "when": "morning"}, headers=u1["h"]).json()
        assert priv["shared"] is False and priv["days_done"] == 0 and priv["current_streak"] == 0
        shared = requests.post(f"{API}/habits", json={"name": "TEST_shared", "when": "evening", "shared": True}, headers=u1["h"]).json()
        assert shared["shared"] is True

        mine = requests.get(f"{API}/habits/mine", headers=u1["h"]).json()
        assert {h["id"] for h in mine} == {priv["id"], shared["id"]}
        assert requests.get(f"{API}/habits/mine", headers=u2["h"]).json() == []

        today = date.today()
        d = lambda i: (today - timedelta(days=i)).isoformat()
        hid = shared["id"]
        for i in (0, 1, 4):
            r = requests.put(f"{API}/habits/{hid}/ticks/{d(i)}", json={"done": True}, headers=u1["h"])
            assert r.status_code == 200
        r = requests.get(f"{API}/habits/{hid}", headers=u1["h"]).json()
        assert r["days_done"] == 3 and r["current_streak"] == 2
        # idempotent tick
        r = requests.put(f"{API}/habits/{hid}/ticks/{d(0)}", json={"done": True}, headers=u1["h"]).json()
        assert r["days_done"] == 3
        # untick today -> only yesterday & 4 days ago -> streak 1
        r = requests.put(f"{API}/habits/{hid}/ticks/{d(0)}", json={"done": False}, headers=u1["h"]).json()
        assert r["days_done"] == 2 and r["current_streak"] == 1
        # yesterday + day before -> streak 2
        r = requests.put(f"{API}/habits/{hid}/ticks/{d(2)}", json={"done": True}, headers=u1["h"]).json()
        assert r["current_streak"] == 2 and r["days_done"] == 3

        # invalid date
        assert requests.put(f"{API}/habits/{hid}/ticks/2026-13-40", json={"done": True}, headers=u1["h"]).status_code == 400
        assert requests.put(f"{API}/habits/{hid}/ticks/abc", json={"done": True}, headers=u1["h"]).status_code == 400

        # community
        comm = requests.get(f"{API}/habits/community", headers=u2["h"]).json()
        ids = {h["id"] for h in comm}
        assert hid in ids and priv["id"] not in ids
        c = next(h for h in comm if h["id"] == hid)
        assert c["owner_name"] == "TEST_Owner" and c["when"] == "evening" and c["days_done"] == 3
        assert all(h["shared"] for h in comm)

        # permissions
        assert requests.get(f"{API}/habits/{hid}", headers=u2["h"]).status_code == 200
        assert requests.put(f"{API}/habits/{hid}/ticks/{d(0)}", json={"done": True}, headers=u2["h"]).status_code == 403
        assert requests.get(f"{API}/habits/{priv['id']}", headers=u2["h"]).status_code == 404
        assert requests.put(f"{API}/habits/{priv['id']}/ticks/{d(0)}", json={"done": True}, headers=u2["h"]).status_code == 404
        assert requests.post(f"{API}/habits/{priv['id']}/comments", json={"text": "x"}, headers=u2["h"]).status_code == 404

        # comments
        r = requests.post(f"{API}/habits/{hid}/comments", json={"text": "TEST nice!"}, headers=u2["h"])
        assert r.status_code == 200 and r.json()["author_name"] == "TEST_Other"
        assert requests.post(f"{API}/habits/{hid}/comments", json={"text": "   "}, headers=u2["h"]).status_code in (400, 422)
        cl = requests.get(f"{API}/habits/{hid}/comments", headers=u1["h"]).json()
        assert any(x["text"] == "TEST nice!" and x["author_name"] == "TEST_Other" for x in cl)
        assert all("_id" not in x for x in cl)

    def test_validation(self, u1):
        assert requests.post(f"{API}/habits", json={"name": ""}, headers=u1["h"]).status_code == 422
        assert requests.get(f"{API}/habits/nonexistent", headers=u1["h"]).status_code == 404
