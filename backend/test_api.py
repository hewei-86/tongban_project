"""
后端接口自测（FastAPI TestClient + 临时 SQLite）。

覆盖：健康检查、注册 / 登录 / JWT、账号数据隔离、版本冲突、未授权访问、
AI 出题开关、密码不明文存储。

用法：
    cd backend
    .venv\\Scripts\\python.exe test_api.py     # Windows
    python test_api.py                        # macOS / Linux
"""

import os
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "test_tongban.db"
if DB_PATH.exists():
    DB_PATH.unlink()

# 必须在导入 main 之前设置环境变量
os.environ["DATABASE_URL"] = f"sqlite:///{DB_PATH.as_posix()}"
os.environ["JWT_SECRET"] = "test-secret-for-local-only-please-change-1234567890"
os.environ["DASHSCOPE_API_KEY"] = ""
sys.path.insert(0, str(BASE_DIR))

from fastapi.testclient import TestClient  # noqa: E402

from database import SessionLocal  # noqa: E402
from main import app, engine  # noqa: E402
from models import User  # noqa: E402

passed = 0
failed = 0


def check(name: str, condition: bool, detail: str = "") -> None:
    global passed, failed
    if condition:
        passed += 1
        print(f"OK   {name}")
    else:
        failed += 1
        print(f"FAIL {name} {detail}")


def main() -> int:
    with TestClient(app) as client:
        # ---------- 健康检查 ----------
        r = client.get("/api/health")
        health = r.json()
        check("健康检查", r.status_code == 200 and health.get("ok") is True, r.text[:120])
        check("健康检查返回数据库类型", health.get("database") == "sqlite", str(health))

        # ---------- 注册 / 登录 ----------
        alice_payload = {"username": "alice_01", "password": "secret123", "nickname": "小艾"}
        r = client.post("/api/auth/register", json=alice_payload)
        alice = r.json()
        check("注册成功", r.status_code == 200 and alice.get("token"), r.text[:160])
        alice_uid = alice.get("user", {}).get("id")
        alice_token = alice.get("token", "")

        r = client.post("/api/auth/register", json=alice_payload)
        check("重复注册被拒绝", r.status_code == 409, r.text[:120])

        r = client.post("/api/auth/login", json={"username": "alice_01", "password": "wrong-pass"})
        check("错误密码登录失败", r.status_code == 401, r.text[:120])

        r = client.post("/api/auth/login", json={"username": "ALICE_01", "password": "secret123"})
        check("账号大小写不敏感登录", r.status_code == 200 and r.json().get("token"), r.text[:120])

        headers_alice = {"Authorization": f"Bearer {alice_token}"}
        r = client.get("/api/auth/me", headers=headers_alice)
        check("读取当前用户", r.status_code == 200 and r.json()["user"]["username"] == "alice_01", r.text[:120])

        r = client.get("/api/auth/me")
        check("未登录访问被拒绝", r.status_code == 401, r.text[:120])

        r = client.get("/api/state", headers={"Authorization": "Bearer not-a-real-token"})
        check("伪造 token 被拒绝", r.status_code == 401, r.text[:120])

        # ---------- 账号状态同步 ----------
        r = client.get("/api/state", headers=headers_alice)
        state = r.json()
        check("新账号初始状态为空", r.status_code == 200 and state.get("version") == 0 and state.get("data") is None, r.text[:120])

        alice_state = {
            "version": 1,
            "settings": {"role": "child", "grade": 2},
            "profiles": [{"user_id": 1, "points": 12}],
            "records": [{"id": 1, "subject": "math", "is_correct": True}],
        }
        r = client.put("/api/state", headers=headers_alice, json={"base_version": 0, "data": alice_state})
        check("首次上传账号数据", r.status_code == 200 and r.json().get("version") == 1, r.text[:160])

        alice_state["profiles"][0]["points"] = 15
        r = client.put("/api/state", headers=headers_alice, json={"base_version": 1, "data": alice_state})
        check("版本递增保存", r.status_code == 200 and r.json().get("version") == 2, r.text[:160])

        r = client.get("/api/state", headers=headers_alice)
        check("读取已保存数据", r.status_code == 200 and r.json()["data"]["profiles"][0]["points"] == 15, r.text[:160])

        r = client.put("/api/state", headers=headers_alice, json={"base_version": 1, "data": alice_state})
        conflict = r.json().get("detail", {})
        check("旧版本写入被拒绝", r.status_code == 409 and conflict.get("version") == 2, r.text[:160])
        check("冲突响应带最新数据", conflict.get("data", {}).get("profiles", [{}])[0].get("points") == 15, str(conflict)[:160])

        # ---------- 第二个账号的数据隔离 ----------
        r = client.post(
            "/api/auth/register",
            json={"username": "bob_2026", "password": "bobpass123", "nickname": "小博"},
        )
        bob = r.json()
        bob_token = bob.get("token", "")
        check("第二个账号注册", r.status_code == 200 and bob_token, r.text[:160])
        headers_bob = {"Authorization": f"Bearer {bob_token}"}

        r = client.get("/api/state", headers=headers_bob)
        check("新账号看不到别人的数据", r.status_code == 200 and r.json().get("version") == 0 and r.json().get("data") is None, r.text[:160])

        bob_state = {"version": 1, "settings": {"role": "parent", "grade": 1}, "records": []}
        r = client.put("/api/state", headers=headers_bob, json={"base_version": 0, "data": bob_state})
        check("第二个账号写入自己的数据", r.status_code == 200 and r.json().get("version") == 1, r.text[:160])

        r = client.get("/api/state", headers=headers_alice)
        check("账号 A 数据不受 B 影响", r.status_code == 200 and r.json()["data"]["profiles"][0]["points"] == 15, r.text[:160])

        # ---------- AI 出题（未配置 Key） ----------
        r = client.post(
            "/api/practice/generate",
            headers=headers_alice,
            json={"user_id": 1, "subject": "math", "grade": 1, "count": 3},
        )
        payload = r.json()
        check("未配置 Key 时 AI 出题降级", r.status_code == 200 and payload.get("ai_enabled") is False, r.text[:160])
        check("降级时不返回题目", payload.get("questions") == [], str(payload)[:160])

        r = client.post("/api/practice/generate", json={"user_id": 1, "subject": "math", "grade": 1, "count": 3})
        check("AI 出题需要登录", r.status_code == 401, r.text[:120])

        # ---------- 密码安全 ----------
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.username == "alice_01").first()
            check("密码不以明文保存", bool(user) and user.password_hash != "secret123" and user.password_hash.startswith("pbkdf2_sha256$"), user.password_hash[:40] if user else "")
        finally:
            db.close()

        # ---------- 失败状态码 ----------
        r = client.put("/api/state", headers=headers_alice, json={"base_version": 0, "data": {"x": "y"}})
        check("冲突时不会覆盖数据", r.status_code == 409, r.text[:120])

        check("用户 id 存在", isinstance(alice_uid, int) and alice_uid > 0, str(alice_uid))

    print()
    print(f"通过 {passed} 项，失败 {failed} 项")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    try:
        code = main()
    finally:
        engine.dispose()
        try:
            if DB_PATH.exists():
                DB_PATH.unlink()
        except OSError:
            print(f"提示：临时数据库 {DB_PATH.name} 仍被占用，可以手动删除。")
    sys.exit(code)
