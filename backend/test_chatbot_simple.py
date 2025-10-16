import re
from typing import List, Dict, Optional

class SimpleChatbotTest:
    def __init__(self):
        # Define intent patterns
        self.intent_patterns = {
            'greeting': [
                r'\b(hi|hello|hey|good morning|good afternoon|good evening)\b',
                r'\bgreetings?\b'
            ],
            'help_request': [
                r'\b(help|support|assistance|problem|issue|trouble)\b',
                r'\b(can\'t|cannot|unable to|won\'t|will not)\b',
                r'\b(not working|broken|error|bug|fail)\b',
                r'\b(how to|how do i|how can i)\b'
            ],
            'password_reset': [
                r'\b(password|pass|login|sign in|authentication)\b.*\b(reset|forgot|forgotten|change|recover)\b',
                r'\b(forgot|forgotten|lost)\b.*\b(password|pass|login)\b',
                r'\b(reset|change|recover)\b.*\b(password|pass|login)\b'
            ],
            'computer_issues': [
                r'\b(computer|pc|laptop|desktop|machine)\b.*\b(not working|broken|slow|freeze|crash|start|boot)\b',
                r'\b(blue screen|bsod|restart|reboot|shutdown)\b',
                r'\b(hardware|software)\b.*\b(problem|issue|error)\b'
            ],
            'network_issues': [
                r'\b(internet|network|wifi|connection|connectivity)\b.*\b(down|slow|not working|problem|issue)\b',
                r'\b(can\'t connect|cannot connect|no internet|no network)\b'
            ],
            'software_issues': [
                r'\b(application|app|software|program)\b.*\b(not working|crash|error|freeze|slow)\b',
                r'\b(microsoft|office|excel|word|outlook|teams)\b.*\b(problem|issue|error)\b'
            ],
            'escalate': [
                r'\b(escalate|human|agent|person|speak to|talk to)\b',
                r'\b(not helpful|doesn\'t help|can\'t help|unable to help)\b',
                r'\b(manager|supervisor|senior)\b'
            ]
        }
        
        # Define responses
        self.responses = {
            'greeting': "Hello! I'm HelpMate, your IT support assistant. How can I help you today?",
            'password_reset': "I can help you with password reset! Here's what you can try:\n1. Go to the login page and click 'Forgot Password'\n2. Enter your email address\n3. Check your email for reset instructions\n4. If you don't receive an email, contact IT support.\n\nWould you like me to create a ticket for further assistance?",
            'computer_issues': "I understand you're having computer issues. Here are some basic troubleshooting steps:\n1. Try restarting your computer\n2. Check all cable connections\n3. Run Windows Update\n4. Check for any error messages\n\nIf these don't help, I can create a support ticket for you. Would you like me to do that?",
            'network_issues': "Network connectivity issues can be frustrating. Let's try these steps:\n1. Check if your WiFi is connected\n2. Try disconnecting and reconnecting to WiFi\n3. Restart your router/modem\n4. Check if other devices have internet access\n\nIf the problem persists, I can escalate this to our network team. Shall I create a ticket?",
            'software_issues': "Software problems can often be resolved with these steps:\n1. Close and restart the application\n2. Check for software updates\n3. Restart your computer\n4. Try running the software as administrator\n\nIf the issue continues, I can create a support ticket. Would you like me to help with that?",
            'escalate': "I understand you'd like to speak with a human agent. I'll create a support ticket and assign it to our team. Please provide a brief description of your issue.",
            'default': "I'm here to help! Could you please describe your issue in more detail? I can assist with:\n• Password resets\n• Computer problems\n• Network issues\n• Software troubles\n• Creating support tickets\n\nOr type 'escalate' to speak with a human agent."
        }

    def detect_intent(self, message: str) -> str:
        """Detect user intent from message"""
        message_lower = message.lower()
        for intent, patterns in self.intent_patterns.items():
            for pattern in patterns:
                if re.search(pattern, message_lower, re.IGNORECASE):
                    return intent
        return 'unknown'

    def get_response(self, intent: str) -> str:
        """Get response for given intent"""
        return self.responses.get(intent, self.responses['default'])

    def process_message(self, message: str) -> str:
        """Process user message and return appropriate response"""
        intent = self.detect_intent(message)
        
        if intent == 'unknown':
            intent = 'default'
        
        return self.get_response(intent)

def test_chatbot():
    chatbot = SimpleChatbotTest()
    
    # Test different types of messages
    test_messages = [
        "Hello",
        "I forgot my password",
        "My computer won't start",
        "I need help with WiFi",
        "Outlook is not working",
        "I want to speak to an agent",
        "How do I reset my password?",
        "My laptop is running very slow",
        "The internet is down",
        "Excel keeps crashing"
    ]
    
    print("Testing Chatbot Intent Detection and Responses")
    print("=" * 60)
    
    for message in test_messages:
        intent = chatbot.detect_intent(message)
        response = chatbot.process_message(message)
        print(f"\nUser: {message}")
        print(f"Detected Intent: {intent}")
        print(f"Bot: {response}")
        print("-" * 40)

if __name__ == "__main__":
    test_chatbot()
