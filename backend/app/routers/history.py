from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any
from app.utils.mongo import get_database
from app.routers.deps import get_current_user

router = APIRouter()

@router.get("/")
async def get_history_and_metrics(current_user: dict = Depends(get_current_user)):
    try:
        db = get_database()
        user_id = current_user.get("id", "")
        
        # Only fetch history for the authenticated user
        cursor = db["history"].find({"user_id": user_id}).sort("timestamp", -1)
        results = await cursor.to_list(length=1000)
        
        total = len(results)
        correct = 0
        wrong = 0
        partial = 0
        
        for r in results:
            r["_id"] = str(r["_id"])
            verdict = r.get("verdict", "").upper()
            if verdict == "TRUE":
                correct += 1
            elif verdict == "FALSE":
                wrong += 1
            else:
                partial += 1

        accuracy = 0
        if total > 0:
            accuracy = round((correct / total) * 100, 1)

        metrics = {
            "total": total,
            "correct": correct,
            "wrong": wrong,
            "partial": partial,
            "accuracy": accuracy
        }

        return {"metrics": metrics, "history": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
