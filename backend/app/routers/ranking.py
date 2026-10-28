from fastapi import APIRouter, Depends
from datetime import datetime, timezone

from app.core.config import db
from app.core.security import current_user

router = APIRouter()


@router.get("/ranking/monitors")
async def monitor_ranking(user=Depends(current_user)):
    monitors = await db.users.find(
        {"role": "monitor"}, {"_id": 0, "id": 1, "name": 1, "picture": 1, "program": 1}
    ).to_list(1000)
    monitor_map = {monitor["id"]: monitor for monitor in monitors}
    stats = {
        monitor_id: {**monitor, "answers": 0, "accepted": 0, "rating_sum": 0, "rating_count": 0, "rating": 0}
        for monitor_id, monitor in monitor_map.items()
    }

    questions = await db.questions.find({}, {"_id": 0, "answers": 1, "accepted_id": 1}).to_list(5000)
    answer_ids = []
    answer_owner = {}
    for question in questions:
        for answer in question.get("answers", []):
            monitor_id = answer.get("author_id")
            if monitor_id not in stats:
                continue
            row = stats[monitor_id]
            row["answers"] += 1
            if question.get("accepted_id") == answer.get("id"):
                row["accepted"] += 1
            answer_ids.append(answer["id"])
            answer_owner[answer["id"]] = monitor_id

    if answer_ids:
        ratings = await db.answer_ratings.find(
            {"answer_id": {"$in": answer_ids}}, {"_id": 0, "answer_id": 1, "rating": 1}
        ).to_list(50000)
        for rating in ratings:
            row = stats.get(answer_owner.get(rating.get("answer_id")))
            if row:
                row["rating_sum"] += int(rating.get("rating") or 0)
                row["rating_count"] += 1

    contributors = []
    for row in stats.values():
        if row["answers"] == 0:
            continue
        row["rating"] = round(row["rating_sum"] / row["rating_count"], 2) if row["rating_count"] else 0
        row.pop("rating_sum", None)
        contributors.append(row)

    by_answers = sorted(contributors, key=lambda row: (-row["answers"], -row["accepted"], -row["rating"], row["name"].casefold()))
    by_rating = sorted(
        (row for row in contributors if row["rating_count"]),
        key=lambda row: (-row["rating"], -row["rating_count"], -row["accepted"], row["name"].casefold()),
    )
    return {
        "by_answers": [{**row, "position": index + 1} for index, row in enumerate(by_answers)],
        "by_rating": [{**row, "position": index + 1} for index, row in enumerate(by_rating)],
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
