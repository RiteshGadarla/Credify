from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any
from bson import ObjectId
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
        
        total_claims = 0
        correct = 0
        wrong = 0
        partial = 0
        
        for r in results:
            r["_id"] = str(r["_id"])
            if r.get("type") == "fact_check":
                for claim in r.get("claims", []):
                    total_claims += 1
                    verdict = claim.get("verdict", "").upper()
                    if verdict == "TRUE":
                        correct += 1
                    elif verdict == "FALSE":
                        wrong += 1
                    else:
                        partial += 1

        accuracy = 0
        if total_claims > 0:
            accuracy = round((correct / total_claims) * 100, 1)

        metrics = {
            "total": total_claims,
            "correct": correct,
            "wrong": wrong,
            "partial": partial,
            "accuracy": accuracy
        }

        return {"metrics": metrics, "history": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{item_id}")
async def delete_history_item(item_id: str, current_user: dict = Depends(get_current_user)):
    try:
        db = get_database()
        user_id = current_user.get("id", "")
        result = await db["history"].delete_one({"_id": ObjectId(item_id), "user_id": user_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Item not found")
        return {"message": "Item deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/")
async def delete_all_history(current_user: dict = Depends(get_current_user)):
    try:
        db = get_database()
        user_id = current_user.get("id", "")
        result = await db["history"].delete_many({"user_id": user_id})
        return {"message": f"Deleted {result.deleted_count} items"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
