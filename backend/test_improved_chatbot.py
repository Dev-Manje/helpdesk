import re

class ImprovedChatbotTest:
    def __init__(self):
        # Updated intent patterns from chatbot_service.py
        self.intent_patterns = {
            'greeting': [
                r'\b(hi|hello|hey|good morning|good afternoon|good evening)\b',
                r'\bgreetings?\b'
            ],
            'help_request': [
                r'\b(help|support|assistance|problem|issue|trouble)\b',
                r'\b(can\'t|cannot|unable to|won\'t|will not)\b',
                r'\b(not working|broken|error|bug|fail)\b',
                r'\b(how to|how do i|how can i)\b',
                r'\b(need help with|help with)\b'
            ],
            'password_reset': [
                r'\b(password|pass|login|sign in|authentication)\b.*\b(reset|forgot|forgotten|change|recover)\b',
                r'\b(forgot|forgotten|lost)\b.*\b(password|pass|login)\b',
                r'\b(reset|change|recover)\b.*\b(password|pass|login)\b',
                r'\b(how do i|how to)\b.*\b(reset|change)\b.*\b(password|pass|login)\b'
            ],
            'computer_issues': [
                r'\b(computer|pc|laptop|desktop|machine)\b.*\b(not working|broken|slow|freeze|crash|start|boot|won\'t start|will not start)\b',
                r'\b(blue screen|bsod|restart|reboot|shutdown)\b',
                r'\b(hardware|software)\b.*\b(problem|issue|error)\b',
                r'\b(laptop|computer|pc)\b.*\b(slow|running slow|very slow)\b',
                r'\b(my computer|my laptop|my pc)\b.*\b(won\'t|will not|can\'t|cannot)\b'
            ],
            'network_issues': [
                r'\b(internet|network|wifi|connection|connectivity)\b.*\b(down|slow|not working|problem|issue)\b',
                r'\b(can\'t connect|cannot connect|no internet|no network)\b'
            ],
            'software_issues': [
                r'\b(application|app|software|program)\b.*\b(not working|crash|error|freeze|slow)\b',
                r'\b(microsoft|office|excel|word|outlook|teams)\b.*\b(problem|issue|error|not working|crash|crashing|keeps crashing)\b',
                r'\b(excel|word|outlook|teams|office)\b.*\b(crash|crashing|keeps crashing|not working|won\'t open|will not open)\b',
                r'\b(outlook|excel|word|teams|office)\b.*\b(is not working|not working)\b',
                r'\b(teams)\b.*\b(won\'t open|will not open|won\'t start)\b'
            ],
            'escalate': [
                r'\b(escalate|human|agent|person|speak to|talk to)\b',
                r'\b(not helpful|doesn\'t help|can\'t help|unable to help)\b',
                r'\b(manager|supervisor|senior)\b'
            ]
        }

    def detect_intent(self, message: str) -> str:
        """Detect user intent from message"""
        message_lower = message.lower()

        # Check specific intents first (more specific patterns)
        priority_intents = ['password_reset', 'computer_issues', 'network_issues', 'software_issues', 'escalate', 'create_ticket', 'status_check', 'greeting']

        for intent in priority_intents:
            if intent in self.intent_patterns:
                patterns = self.intent_patterns[intent]
                for pattern in patterns:
                    if re.search(pattern, message_lower, re.IGNORECASE):
                        return intent

        # Check general help_request last
        if 'help_request' in self.intent_patterns:
            patterns = self.intent_patterns['help_request']
            for pattern in patterns:
                if re.search(pattern, message_lower, re.IGNORECASE):
                    return 'help_request'

        return 'unknown'

def test_improved_patterns():
    chatbot = ImprovedChatbotTest()
    
    # Test cases that should now work better
    test_cases = [
        ("Hello", "greeting"),
        ("I forgot my password", "password_reset"),
        ("My computer won't start", "computer_issues"),
        ("I need help with WiFi", "help_request"),
        ("Outlook is not working", "software_issues"),
        ("I want to speak to an agent", "escalate"),
        ("How do I reset my password?", "password_reset"),
        ("My laptop is running very slow", "computer_issues"),
        ("The internet is down", "network_issues"),
        ("Excel keeps crashing", "software_issues"),
        ("Teams won't open", "software_issues"),
        ("Computer is very slow", "computer_issues"),
        ("Help with network connection", "help_request"),
        ("Password reset needed", "password_reset"),
        ("Outlook keeps crashing", "software_issues")
    ]
    
    print("Testing Improved Chatbot Intent Detection")
    print("=" * 50)
    
    correct = 0
    total = len(test_cases)
    
    for message, expected_intent in test_cases:
        detected_intent = chatbot.detect_intent(message)
        is_correct = detected_intent == expected_intent
        status = "✓" if is_correct else "✗"
        
        print(f"{status} '{message}' -> Expected: {expected_intent}, Got: {detected_intent}")
        
        if is_correct:
            correct += 1
    
    print(f"\nAccuracy: {correct}/{total} ({correct/total*100:.1f}%)")

if __name__ == "__main__":
    test_improved_patterns()
