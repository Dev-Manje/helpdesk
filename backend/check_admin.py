import asyncio
from database import database

async def check_admin():
    # Check if admin user exists
    admin_user = await database.users.find_one({"email": "admin"})
    if admin_user:
        print("Admin user found:")
        print(f"  ID: {admin_user.get('_id')}")
        print(f"  Name: {admin_user.get('name')}")
        print(f"  Email: {admin_user.get('email')}")
        print(f"  Role: {admin_user.get('role')}")
        print(f"  Password hash: {admin_user.get('hashed_password')}")
    else:
        print("Admin user NOT found!")

    # List all users
    print("\nAll users in database:")
    users = await database.users.find().to_list(None)
    for user in users:
        print(f"  - {user.get('email')} ({user.get('role')})")

if __name__ == "__main__":
    asyncio.run(check_admin())