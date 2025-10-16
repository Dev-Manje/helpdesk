import asyncio
from chatbot_service import ChatbotService
from database import database
from models import User

async def test_chatbot():
    # Create a test user
    test_user = User(
        _id="test_user_id",
        name="Test User",
        email="test@example.com",
        role="user"
    )
    
    # Initialize chatbot service
    chatbot = ChatbotService(database)
    
    # Test different types of messages
    test_messages = [
        "Hello",
        "I forgot my password",
        "My computer won't start",
        "I need help with WiFi",
        "Outlook is not working",
        "Create a ticket for me",
        "Check my ticket status",
        "I want to speak to an agent"
    ]
    
    print("Testing Chatbot Service")
    print("=" * 50)
    
    for message in test_messages:
        print(f"\nUser: {message}")
        response = await chatbot.process_message(message, test_user)
        print(f"Bot: {response}")
        print("-" * 30)

if __name__ == "__main__":
    asyncio.run(test_chatbot())
