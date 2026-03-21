from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

class Database:
    client: AsyncIOMotorClient = None
    db = None

db_connection = Database()

async def connect_to_mongo():
    """Initializes the MongoDB connection pool."""
    try:
        db_connection.client = AsyncIOMotorClient(settings.MONGO_URI)
        db_connection.db = db_connection.client[settings.DATABASE_NAME]
    except Exception as e:
        raise e

async def close_mongo_connection():
    """Closes the MongoDB connection."""
    if db_connection.client:
        db_connection.client.close()

def get_database():
    """Dependency helper to get database instance."""
    return db_connection.db

async def insert_document(collection_name: str, document: dict) -> str:
    """Inserts a single document and returns the inserted ID."""
    db = get_database()
    if db is None:
        raise RuntimeError("Database not initialized")
    collection = db[collection_name]
    result = await collection.insert_one(document)
    return str(result.inserted_id)

async def get_document(collection_name: str, query: dict) -> dict:
    """Gets a single document matching the query."""
    db = get_database()
    if db is None:
        raise RuntimeError("Database not initialized")
    collection = db[collection_name]
    return await collection.find_one(query)

async def update_document(collection_name: str, query: dict, update_data: dict, push: bool = False):
    """Updates documents matching the query."""
    db = get_database()
    if db is None:
        raise RuntimeError("Database not initialized")
    collection = db[collection_name]
    if push:
        await collection.update_many(query, {"$addToSet": update_data})
    else:
        await collection.update_many(query, {"$set": update_data})
