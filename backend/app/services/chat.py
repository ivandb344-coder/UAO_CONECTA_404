from fastapi import WebSocket
from typing import Dict, List
import asyncio, json

class ConnectionManager:
    def __init__(self):
        # room -> list of {"ws": ws, "user": {id,name,role,initial}}
        self.rooms: Dict[str, List[dict]] = {}
        self.lock = asyncio.Lock()

    async def connect(self, room: str, ws: WebSocket, user_meta: dict):
        await ws.accept()
        async with self.lock:
            self.rooms.setdefault(room, []).append({"ws": ws, "user": user_meta})

    async def disconnect(self, room: str, ws: WebSocket):
        async with self.lock:
            entries = self.rooms.get(room, [])
            self.rooms[room] = [e for e in entries if e["ws"] is not ws]
            if room in self.rooms and not self.rooms[room]:
                self.rooms.pop(room, None)

    async def broadcast(self, room: str, payload: dict):
        raw = json.dumps(payload)
        dead = []
        for entry in list(self.rooms.get(room, [])):
            try:
                await entry["ws"].send_text(raw)
            except Exception:
                dead.append(entry["ws"])
        for ws in dead:
            await self.disconnect(room, ws)

    def presence_payload(self, room: str) -> dict:
        # Deduplicate by user id so multiple tabs from the same user count once
        seen = {}
        for entry in self.rooms.get(room, []):
            u = entry["user"]
            seen[u["id"]] = u
        users = list(seen.values())
        return {"type": "presence", "size": len(users), "users": users}

manager = ConnectionManager()
