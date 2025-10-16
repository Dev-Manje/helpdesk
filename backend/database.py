from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = "mongodb://localhost:27017"  # Update if needed

client = AsyncIOMotorClient(MONGO_URL)
database = client.helpdesk