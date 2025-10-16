import requests

def test_frontend():
    """Test if frontend is running"""
    try:
        response = requests.get("http://localhost:3000/", timeout=5)
        print(f"✅ Frontend is running on port 3000")
        print(f"Status: {response.status_code}")
        return True
    except requests.exceptions.ConnectionError:
        print("❌ Frontend is not running on port 3000")
        return False
    except Exception as e:
        print(f"❌ Error connecting to frontend: {e}")
        return False

def test_backend():
    """Test if backend is running"""
    try:
        response = requests.get("http://localhost:8000/", timeout=5)
        print(f"✅ Backend is running on port 8000")
        print(f"Response: {response.json()}")
        return True
    except requests.exceptions.ConnectionError:
        print("❌ Backend is not running on port 8000")
        return False
    except Exception as e:
        print(f"❌ Error connecting to backend: {e}")
        return False

if __name__ == "__main__":
    print("🔧 HelpMate System Status Check")
    print("=" * 40)
    
    backend_ok = test_backend()
    frontend_ok = test_frontend()
    
    print("\n" + "=" * 40)
    print("📋 System Status:")
    print(f"Backend (port 8000): {'✅ Running' if backend_ok else '❌ Not Running'}")
    print(f"Frontend (port 3000): {'✅ Running' if frontend_ok else '❌ Not Running'}")
    
    if backend_ok and not frontend_ok:
        print("\n💡 To start frontend:")
        print("cd frontend")
        print("npm start")
    elif not backend_ok:
        print("\n💡 To start backend:")
        print("cd backend")
        print("venv\\Scripts\\uvicorn main:app --reload --port 8000")
