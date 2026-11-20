"""
后端接口自测脚本（不依赖真实服务器，使用 FastAPI TestClient）。

用法：
    cd backend
    .venv\\Scripts\\python.exe test_api.py     # Windows
    python test_api.py                        # macOS / Linux

脚本会自动使用临时数据库 test_tongban.db，运行结束后删除，
不会影响你的 tongban.db。
"""

import os
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "test_tongban.db"
if DB_PATH.exists():
    DB_PATH.unlink()

# 必须在导入 main 之前设置环境变量：用临时库、关闭真实 AI 调用
os.environ["DATABASE_URL"] = f"sqlite:///{DB_PATH.as_posix()}"
os.environ["DASHSCOPE_API_KEY"] = ""
sys.path.insert(0, str(BASE_DIR))

from fastapi.testclient import TestClient  # noqa: E402

from main import app, engine  # noqa: E402

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
        def get(path: str):
            return client.get(path)

        def post(path: str, payload=None):
            return client.post(path, json=payload if payload is not None else {})

        r = get("/api/health")
        check("健康检查", r.status_code == 200 and r.json().get("ok") is True, r.text[:120])

        r = get("/api/dashboard?user_id=2")
        data = r.json()
        check("学习首页", r.status_code == 200 and data.get("user_id") == 2, r.text[:120])
        check("首页字段完整", {"points", "level", "streak_days", "checkin_today"} <= set(data.keys()))

        r = get("/api/questions?subject=math&grade=1")
        check("题库查询", r.status_code == 200 and len(r.json()) >= 5, r.text[:120])
        r = get("/api/questions?subject=%E6%95%B0%E5%AD%A6&grade=1")
        check("学科中文别名", r.status_code == 200 and len(r.json()) >= 5, r.text[:120])

        r = post("/api/learning/submit", {"user_id": 2, "question_id": 1, "answer": "15", "time_spent": 30})
        result = r.json()
        check("答题提交", r.status_code == 200 and result.get("is_correct") is True, r.text[:120])
        check("答题返回成就字段", "new_achievements" in result)

        r = post("/api/learning/submit", {"user_id": 2, "question_id": 2, "answer": "6", "time_spent": 20})
        check("答错判定", r.status_code == 200 and r.json().get("is_correct") is False, r.text[:120])

        r = get("/api/wrong-book?user_id=2")
        wrong_list = r.json()
        check("错题本列出错题", r.status_code == 200 and len(wrong_list) >= 1, r.text[:120])
        if wrong_list:
            wrong_id = wrong_list[0]["id"]
            r = post(f"/api/wrong-book/retry/{wrong_id}", {"answer": "7"})
            check("错题重做", r.status_code == 200 and r.json().get("is_correct") is True, r.text[:160])
            r = post(f"/api/wrong-book/master/{wrong_id}")
            check("标记掌握", r.status_code == 200 and r.json().get("ok") is True)

        r = post("/api/checkin", {"user_id": 2})
        first = r.json()
        check("签到成功", r.status_code == 200 and first.get("already") is False and first.get("ok") is True, r.text[:120])
        r = post("/api/checkin", {"user_id": 2})
        check("重复签到", r.status_code == 200 and r.json().get("already") is True, r.text[:120])

        r = get("/api/tasks/daily?user_id=2&grade=1")
        tasks = r.json()
        check("每日任务", r.status_code == 200 and len(tasks) == 3, r.text[:120])

        r = post("/api/practice/generate", {"user_id": 2, "subject": "math", "grade": 2, "count": 3})
        payload = r.json()
        check("AI 出题", r.status_code == 200 and len(payload.get("questions", [])) >= 1, r.text[:160])
        ai_questions = payload.get("questions", [])
        if ai_questions:
            check("出题会落库并返回真实 id", ai_questions[0].get("id", 0) > 0)
            r = post("/api/learning/submit", {
                "user_id": 2,
                "question_id": ai_questions[0]["id"],
                "answer": "0",
                "time_spent": 20,
            })
            check("AI 题可提交", r.status_code == 200, r.text[:120])

        r = post("/api/ai/chat", {"user_id": 2, "grade": 1, "message": "8+7等于几"})
        check("AI 问答（演示模式）", r.status_code == 200 and "15" in r.json().get("answer", ""), r.text[:120])

        r = get("/api/reports/weekly?child_id=2")
        report = r.json()
        check("周报", r.status_code == 200 and report.get("total_records", 0) >= 2, r.text[:120])

        r = get("/api/reports/monthly?child_id=2")
        check("月报", r.status_code == 200 and "accuracy" in r.json(), r.text[:120])

        r = post("/api/goals", {"family_id": 1, "child_user_id": 2, "parent_user_id": 1,
                                "title": "每天 10 分钟口算", "target_minutes": 10})
        goal = r.json()
        check("创建目标", r.status_code == 200 and goal.get("ok") is True, r.text[:120])
        r = get("/api/goals?child_id=2")
        check("目标列表", r.status_code == 200 and len(r.json()) >= 1, r.text[:120])
        r = post(f"/api/goals/{goal['id']}/complete")
        check("完成目标", r.status_code == 200 and r.json().get("ok") is True)

        r = post("/api/evaluations", {"family_id": 1, "direction": "parent_to_child",
                                      "item": "学习主动性", "score": 5, "comment": "今天很主动"})
        check("家长评价孩子", r.status_code == 200 and r.json().get("ok") is True, r.text[:120])
        r = post("/api/evaluations", {"family_id": 1, "direction": "child_to_parent",
                                      "item": "陪伴时间", "score": 4, "comment": "谢谢陪我"})
        check("孩子评价家长", r.status_code == 200 and r.json().get("ok") is True, r.text[:120])
        r = get("/api/family/harmony?family_id=1")
        check("默契度", r.status_code == 200 and r.json().get("count") == 2, r.text[:120])

        r = get("/api/growth?child_id=2")
        check("成长档案", r.status_code == 200 and "level" in r.json(), r.text[:120])
        r = get("/api/growth-curve?child_id=2&days=7")
        check("成长曲线", r.status_code == 200 and len(r.json()) == 7, r.text[:120])
        r = get("/api/achievements?child_id=2")
        check("成就列表", r.status_code == 200 and len(r.json()) >= 10, r.text[:120])
        r = get("/api/leaderboard?family_id=1")
        check("家庭榜", r.status_code == 200 and len(r.json()) >= 1, r.text[:120])

        r = post("/api/challenge/submit", {"user_id": 2, "score": 30, "correct": 7, "total": 9, "seconds": 60})
        challenge = r.json()
        check("速算挑战提交", r.status_code == 200 and challenge.get("best") == 30, r.text[:160])
        check("挑战奖励计算", challenge.get("points_earned") == 19 and challenge.get("is_new_best") is True)
        r = get("/api/challenge/best?user_id=2")
        check("挑战最高分", r.status_code == 200 and r.json().get("best") == 30, r.text[:120])

        r = post("/api/time-limit", {"child_user_id": 2, "daily_limit_minutes": 45, "warning_minutes": 35})
        check("时长限制", r.status_code == 200 and r.json().get("daily_limit_minutes") == 45, r.text[:120])
        r = get("/api/time-limit?child_user_id=2")
        check("读取时长限制", r.status_code == 200 and r.json().get("daily_limit_minutes") == 45, r.text[:120])

        r = get("/api/parent/dashboard?family_id=1")
        parent = r.json()
        check("家长看板", r.status_code == 200 and len(parent.get("children", [])) == 1, r.text[:120])

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
