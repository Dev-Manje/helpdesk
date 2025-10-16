import requests
import json

def test_backend_connection():
    """Test if backend is running"""
    try:
        response = requests.get("http://localhost:8000/", timeout=5)
        print(f"✅ Backend is running: {response.json()}")
        return True
    except requests.exceptions.ConnectionError:
        print("❌ Backend is not running on port 8000")
        return False
    except Exception as e:
        print(f"❌ Error connecting to backend: {e}")
        return False

def test_login():
    """Test login functionality"""
    if not test_backend_connection():
        return
    
    # Test credentials from seed.py
    test_users = [
        {"username": "user@example.com", "password": "password"},
        {"username": "agent@example.com", "password": "password"},
        {"username": "manager@example.com", "password": "password"},
        {"username": "admin", "password": "password"}
    ]
    
    for user in test_users:
        print(f"\n🔍 Testing login for: {user['username']}")
        
        try:
            # Prepare form data as expected by FastAPI OAuth2PasswordRequestForm
            data = {
                "username": user["username"],
                "password": user["password"]
            }
            
            response = requests.post(
                "http://localhost:8000/auth/login",
                data=data,  # Use data instead of json for form data
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                timeout=10
            )
            
            print(f"Status Code: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ Login successful!")
                print(f"Token: {result.get('access_token', 'No token')[:50]}...")
            else:
                print(f"❌ Login failed!")
                print(f"Response: {response.text}")
                
        except Exception as e:
            print(f"❌ Error during login: {e}")

def test_database_connection():
    """Test if database has users"""
    print("\n🔍 Testing database connection...")
    try:
        import asyncio
        from database import database
        
        async def check_users():
            try:
                users = await database.users.find().to_list(None)
                print(f"✅ Found {len(users)} users in database")
                for user in users:
                    print(f"  - {user.get('email', 'No email')} ({user.get('role', 'No role')})")
                return len(users) > 0
            except Exception as e:
                print(f"❌ Database error: {e}")
                return False
        
        return asyncio.run(check_users())
    except Exception as e:
        print(f"❌ Cannot connect to database: {e}")
        return False

if __name__ == "__main__":
    print("🔧 HelpMate Login Troubleshooting")
    print("=" * 40)
    
    # Test database first
    db_ok = test_database_connection()
    
    # Test login
    test_login()
    
    print("\n" + "=" * 40)
    print("💡 Troubleshooting Tips:")
    print("1. Make sure MongoDB is running on localhost:27017")
    print("2. Run 'python seed.py' to populate the database")
    print("3. Start backend with 'uvicorn main:app --reload --port 8000'")
    print("4. Check that users exist in the database")
