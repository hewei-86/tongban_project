"""真人 PK：WebSocket 匹配、服务端出题与判分。

单实例内存匹配队列；多实例部署时需要换成 Redis 队列。
"""

import asyncio
import json
import random
from datetime import datetime

import jwt
from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from database import SessionLocal
from models import PkMatch, Question, User, UserStatus
from security import JWT_ALGORITHM, JWT_SECRET

router = APIRouter()

QUESTION_COUNT = 5
QUESTION_SECONDS = 15
WAITING_LOCK = asyncio.Lock()


def load_user(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = int(payload.get("sub", 0))
    except Exception:
        return None
    db = SessionLocal()
    try:
        user = db.get(User, user_id)
        if not user or user.role == "admin":
            return None
        status = db.get(UserStatus, user.id)
        if status and not status.is_active:
            return None
        return {
            "id": user.id,
            "username": user.username,
            "nickname": user.nickname or user.username,
        }
    finally:
        db.close()


def load_questions(limit: int = QUESTION_COUNT) -> list[dict]:
    db = SessionLocal()
    try:
        rows = db.query(Question).filter(Question.grade >= 1, Question.grade <= 6).all()
    finally:
        db.close()
    usable = []
    for row in rows:
        try:
            options = json.loads(row.options) if row.options else []
        except Exception:
            options = []
        if not options:
            continue
        usable.append(
            {
                "id": row.id,
                "subject": row.subject,
                "grade": row.grade,
                "content": row.content,
                "answer": row.answer,
                "explanation": row.explanation,
                "options": options,
            }
        )
    random.shuffle(usable)
    if len(usable) < limit:
        return usable
    return usable[:limit]


def normalize(value) -> str:
    return str(value or "").strip().lower().replace(" ", "")


def save_match(room: "Room") -> None:
    db = SessionLocal()
    try:
        row = PkMatch(
            player1_id=room.p1.user["id"],
            player2_id=room.p2.user["id"],
            player1_score=room.p1.score,
            player2_score=room.p2.score,
            winner_id=room.winner_id(),
            question_count=len(room.questions),
            created_at=datetime.now(),
        )
        db.add(row)
        db.commit()
    except Exception as error:
        print(f"[pk] save match failed: {error}")
        db.rollback()
    finally:
        db.close()


class Player:
    def __init__(self, user: dict, ws: WebSocket):
        self.user = user
        self.ws = ws
        self.score = 0
        self.connected = True
        self.room: "Room | None" = None

    @property
    def pid(self) -> int:
        return self.user["id"]

    async def send(self, payload: dict) -> None:
        if not self.connected:
            return
        try:
            await self.ws.send_json(payload)
        except Exception:
            self.connected = False


class Room:
    def __init__(self, p1: Player, p2: Player):
        self.p1 = p1
        self.p2 = p2
        p1.room = self
        p2.room = self
        self.questions: list[dict] = []
        self.index = 0
        self.deadline = 0.0
        self.answers: dict[int, dict] = {}
        self.event = asyncio.Event()
        self.done = False
        self.task: asyncio.Task | None = None

    def players(self) -> list[Player]:
        return [self.p1, self.p2]

    def winner_id(self) -> int | None:
        if self.p1.score == self.p2.score:
            return None
        return self.p1.pid if self.p1.score > self.p2.score else self.p2.pid

    async def send_both(self, payload: dict) -> None:
        await asyncio.gather(*(player.send(payload) for player in self.players()))

    def submit(self, player: Player, index: int, answer) -> None:
        if self.done or index != self.index or player.pid in self.answers:
            return
        remaining = max(0.0, self.deadline - asyncio.get_event_loop().time())
        self.answers[player.pid] = {"answer": answer, "remaining": remaining}
        self.event.set()

    def disconnect(self, player: Player) -> None:
        player.connected = False
        self.event.set()

    async def start(self) -> None:
        self.questions = load_questions()
        await self.send_both(
            {
                "type": "matched",
                "room_id": id(self),
                "opponent": {
                    "id": self.p2.pid,
                    "nickname": self.p2.user["nickname"],
                },
                "total": len(self.questions),
            }
        )
        # 给对手发自己的信息（上面的 matched 只带了一个对手，这里补齐）
        await self.p1.send({"type": "opponent", "opponent": {"id": self.p2.pid, "nickname": self.p2.user["nickname"]}})
        await self.p2.send({"type": "opponent", "opponent": {"id": self.p1.pid, "nickname": self.p1.user["nickname"]}})

        for idx, question in enumerate(self.questions):
            if self.done or not (self.p1.connected and self.p2.connected):
                break
            self.index = idx
            self.answers = {}
            self.event.clear()
            self.deadline = asyncio.get_event_loop().time() + QUESTION_SECONDS
            payload = {
                "type": "question",
                "index": idx,
                "total": len(self.questions),
                "deadline_ms": int((datetime.now().timestamp() + QUESTION_SECONDS) * 1000),
                "seconds": QUESTION_SECONDS,
                "question": {
                    "id": question["id"],
                    "subject": question["subject"],
                    "grade": question["grade"],
                    "content": question["content"],
                    "options": question["options"],
                },
            }
            await self.send_both(payload)

            while (
                len(self.answers) < 2
                and self.p1.connected
                and self.p2.connected
            ):
                remaining = self.deadline - asyncio.get_event_loop().time()
                if remaining <= 0:
                    break
                try:
                    await asyncio.wait_for(self.event.wait(), timeout=remaining)
                except asyncio.TimeoutError:
                    break
                self.event.clear()

            if not (self.p1.connected and self.p2.connected):
                break

            results = {}
            for player in self.players():
                info = self.answers.get(player.pid)
                correct = bool(info) and normalize(info["answer"]) == normalize(question["answer"])
                gained = 100 + int(info["remaining"] * 5) if correct and info else 0
                player.score += gained
                results[str(player.pid)] = {
                    "correct": correct,
                    "answer": info["answer"] if info else "",
                    "gained": gained,
                }
            await self.send_both(
                {
                    "type": "round_result",
                    "index": idx,
                    "answer": question["answer"],
                    "explanation": question["explanation"],
                    "results": results,
                    "scores": {str(self.p1.pid): self.p1.score, str(self.p2.pid): self.p2.score},
                }
            )
            await asyncio.sleep(1.4 if idx < len(self.questions) - 1 else 0.6)

        await self.finish()

    async def finish(self) -> None:
        if self.done:
            return
        self.done = True
        winner = self.winner_id()
        await self.send_both(
            {
                "type": "finished",
                "scores": {str(self.p1.pid): self.p1.score, str(self.p2.pid): self.p2.score},
                "players": {
                    str(self.p1.pid): self.p1.user["nickname"],
                    str(self.p2.pid): self.p2.user["nickname"],
                },
                "winner_id": winner,
                "draw": winner is None,
            }
        )
        save_match(self)
        manager.rooms.pop(id(self), None)
        for player in self.players():
            try:
                await player.ws.close()
            except Exception:
                pass


class Manager:
    def __init__(self):
        self.waiting: list[Player] = []
        self.rooms: dict[int, Room] = {}

    async def join(self, player: Player) -> None:
        async with WAITING_LOCK:
            if player in self.waiting:
                return
            if self.waiting:
                opponent = self.waiting.pop(0)
                room = Room(opponent, player)
                self.rooms[id(room)] = room
                room.task = asyncio.create_task(room.start())
                return
            self.waiting.append(player)
        await player.send({"type": "waiting", "message": "正在匹配对手…"})

    async def leave(self, player: Player) -> None:
        async with WAITING_LOCK:
            if player in self.waiting:
                self.waiting.remove(player)
        if player.room:
            room = player.room
            room.disconnect(player)
            if room.done:
                self.rooms.pop(id(room), None)


manager = Manager()


@router.websocket("/ws/pk")
async def pk_socket(ws: WebSocket, token: str = Query(default="")):
    user = load_user(token)
    if not user:
        await ws.close(code=1008)
        return
    await ws.accept()
    player = Player(user, ws)
    await manager.join(player)
    try:
        while True:
            data = await ws.receive_json()
            if not isinstance(data, dict):
                continue
            if data.get("type") == "answer" and player.room:
                try:
                    index = int(data.get("index", -1))
                except Exception:
                    continue
                player.room.submit(player, index, data.get("answer"))
            elif data.get("type") == "ping":
                await player.send({"type": "pong"})
    except WebSocketDisconnect:
        pass
    except Exception as error:
        print(f"[pk] socket error: {error}")
    finally:
        await manager.leave(player)
