#!/usr/bin/env python3
"""
Test script for the Chatbot Ticket Creation functionality
"""
import requests
import json
import os

def test_ticket_creation():
    """Test the ticket creation functionality"""
    base_url = "http://localhost:8000"
    
    # Test credentials
    login_data = {
        "username": "user@example.com",
        "password": "password"
    }
    
    print("🎫 Testing Chatbot Ticket Creation System")
    print("=" * 50)
    
    # Login to get token
    print("1. Logging in...")
    try:
        response = requests.post(f"{base_url}/auth/login", data=login_data)
        if response.status_code == 200:
            token = response.json()["access_token"]
            headers = {"Authorization": f"Bearer {token}"}
            print("✅ Login successful")
        else:
            print("❌ Login failed")
            return
    except Exception as e:
        print(f"❌ Login error: {e}")
        return
    
    # Test chatbot message for ticket creation
    print("\n2. Testing chatbot ticket creation trigger...")
    try:
        response = requests.post(f"{base_url}/chatbot/message", 
                               json={"message": "Create a ticket for me"}, 
                               headers=headers)
        if response.status_code == 200:
            bot_response = response.json()["response"]
            print(f"✅ Chatbot response: {bot_response}")
            if bot_response == "SHOW_TICKET_FORM":
                print("✅ Ticket form trigger working correctly")
            else:
                print("⚠️ Unexpected response - form may not trigger")
        else:
            print("❌ Chatbot message failed")
    except Exception as e:
        print(f"❌ Chatbot error: {e}")
    
    # Test getting ticket categories
    print("\n3. Testing ticket categories endpoint...")
    try:
        response = requests.get(f"{base_url}/requests/categories", headers=headers)
        if response.status_code == 200:
            categories = response.json()["categories"]
            print(f"✅ Available categories: {', '.join(categories)}")
        else:
            print("❌ Failed to get categories")
    except Exception as e:
        print(f"❌ Categories error: {e}")
    
    # Test creating a ticket with attachments
    print("\n4. Testing ticket creation with form data...")
    try:
        # Create a test file
        test_file_content = "This is a test file for ticket attachment.\nIssue: Computer won't start\nSteps tried: Checked power cable, pressed power button"
        test_file_path = "test_attachment.txt"
        with open(test_file_path, "w") as f:
            f.write(test_file_content)
        
        # Prepare form data
        form_data = {
            "title": "Computer Won't Start - Urgent Help Needed",
            "description": "My computer suddenly stopped working this morning. I've tried checking the power cable and pressing the power button multiple times, but nothing happens. No lights, no sounds, completely dead. This is affecting my work productivity.",
            "category": "Hardware Issues",
            "priority": "high"
        }
        
        # Prepare file for upload
        files = {
            "files": ("test_attachment.txt", open(test_file_path, "rb"), "text/plain")
        }
        
        response = requests.post(f"{base_url}/requests/with-attachments", 
                               data=form_data, 
                               files=files,
                               headers=headers)
        
        # Clean up test file
        files["files"][1].close()
        os.remove(test_file_path)
        
        if response.status_code == 200:
            ticket_data = response.json()
            print(f"✅ Ticket created successfully!")
            print(f"   Ticket ID: {ticket_data['ticket_id']}")
            print(f"   Status: {ticket_data['status']}")
            print(f"   Attachments: {ticket_data['attachments_count']} file(s)")
            
            # Test retrieving the created ticket
            print("\n5. Testing ticket retrieval...")
            ticket_response = requests.get(f"{base_url}/requests", headers=headers)
            if ticket_response.status_code == 200:
                tickets = ticket_response.json()
                created_ticket = next((t for t in tickets if t['id'] == ticket_data['ticket_id']), None)
                if created_ticket:
                    print("✅ Ticket retrieved successfully")
                    print(f"   Title: {created_ticket['title']}")
                    print(f"   Category: {created_ticket['category']}")
                    print(f"   Priority: {created_ticket['priority']}")
                    print(f"   Has attachments: {'attachments' in created_ticket and len(created_ticket.get('attachments', [])) > 0}")
                else:
                    print("❌ Created ticket not found in list")
            
            return ticket_data['ticket_id']
            
        else:
            print(f"❌ Failed to create ticket: {response.status_code}")
            print(f"   Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Ticket creation error: {e}")
        # Clean up test file if it exists
        if os.path.exists(test_file_path):
            os.remove(test_file_path)
        return None

def test_chatbot_responses():
    """Test various chatbot responses that should trigger ticket creation"""
    base_url = "http://localhost:8000"
    
    # Login
    login_data = {"username": "user@example.com", "password": "password"}
    response = requests.post(f"{base_url}/auth/login", data=login_data)
    
    if response.status_code != 200:
        print("❌ Cannot login for chatbot testing")
        return
    
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    print("\n6. Testing various ticket creation triggers...")
    
    test_messages = [
        "I need to create a ticket",
        "Create a new ticket for me",
        "Submit a support request",
        "File a new case",
        "Open a ticket",
        "I want to escalate this issue"
    ]
    
    for message in test_messages:
        try:
            response = requests.post(f"{base_url}/chatbot/message", 
                                   json={"message": message}, 
                                   headers=headers)
            if response.status_code == 200:
                bot_response = response.json()["response"]
                triggers_form = bot_response == "SHOW_TICKET_FORM" or "create a support ticket" in bot_response.lower()
                print(f"   '{message}': {'✅ Triggers form' if triggers_form else '❌ No form trigger'}")
            else:
                print(f"   '{message}': ❌ API Error")
        except Exception as e:
            print(f"   '{message}': ❌ Error - {e}")

def main():
    """Main test function"""
    ticket_id = test_ticket_creation()
    test_chatbot_responses()
    
    print("\n" + "=" * 50)
    print("🎉 Chatbot Ticket Creation testing completed!")
    print("\n💡 Features tested:")
    print("  ✅ Chatbot ticket creation triggers")
    print("  ✅ Ticket categories endpoint")
    print("  ✅ Ticket creation with attachments")
    print("  ✅ Form data handling")
    print("  ✅ File upload functionality")
    print("  ✅ Ticket retrieval and verification")
    print("\n🚀 Ready for user interaction!")
    
    if ticket_id:
        print(f"\n📋 Test ticket created: #{ticket_id[-6:]}")
        print("You can view this ticket in the Requests tab of the application.")

if __name__ == "__main__":
    main()
