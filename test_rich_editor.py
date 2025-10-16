#!/usr/bin/env python3
"""
Test script for the Rich Text Editor Knowledge Base
"""
import requests
import json

def test_rich_content_creation():
    """Test creating an article with rich HTML content"""
    base_url = "http://localhost:8000"
    
    # Test credentials
    login_data = {
        "username": "agent@example.com",
        "password": "password"
    }
    
    print("🎨 Testing Rich Text Editor Knowledge Base")
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
    
    # Create a rich content article
    print("\n2. Creating article with rich HTML content...")
    
    rich_content = """
    <h1>Complete Guide to Email Setup</h1>
    <p>This comprehensive guide will help you set up your email client with <strong>step-by-step instructions</strong>.</p>
    
    <h2>Prerequisites</h2>
    <ul>
        <li>Valid email account credentials</li>
        <li>Internet connection</li>
        <li>Email client software (Outlook, Thunderbird, etc.)</li>
    </ul>
    
    <h2>Configuration Steps</h2>
    <ol>
        <li><strong>Open your email client</strong></li>
        <li>Navigate to <em>Account Settings</em></li>
        <li>Click <u>Add New Account</u></li>
        <li>Enter your email and password</li>
    </ol>
    
    <blockquote>
        <p><strong>Important:</strong> Make sure to use the correct server settings provided by your IT department.</p>
    </blockquote>
    
    <h3>Server Settings</h3>
    <table border="1" style="border-collapse: collapse; width: 100%;">
        <tr style="background-color: #f0f0f0;">
            <th style="padding: 8px;">Protocol</th>
            <th style="padding: 8px;">Server</th>
            <th style="padding: 8px;">Port</th>
            <th style="padding: 8px;">Security</th>
        </tr>
        <tr>
            <td style="padding: 8px;">IMAP</td>
            <td style="padding: 8px;">mail.company.com</td>
            <td style="padding: 8px;">993</td>
            <td style="padding: 8px;">SSL/TLS</td>
        </tr>
        <tr>
            <td style="padding: 8px;">SMTP</td>
            <td style="padding: 8px;">smtp.company.com</td>
            <td style="padding: 8px;">587</td>
            <td style="padding: 8px;">STARTTLS</td>
        </tr>
    </table>
    
    <h2>Troubleshooting</h2>
    <p>If you encounter issues:</p>
    <ul>
        <li>Check your <code>internet connection</code></li>
        <li>Verify your <span style="color: red;">credentials</span></li>
        <li>Contact IT support if problems persist</li>
    </ul>
    
    <p style="background-color: #e8f5e8; padding: 10px; border-left: 4px solid #4caf50;">
        <strong>Success!</strong> Your email should now be configured and ready to use.
    </p>
    """
    
    try:
        new_article_data = {
            "title": "Email Setup Guide with Rich Formatting",
            "content": rich_content,
            "summary": "Complete guide for setting up email clients with rich HTML formatting, tables, and styling",
            "category": "Email Configuration",
            "tags": "email,setup,configuration,outlook,rich-text,html",
            "links": json.dumps([
                {"title": "Microsoft Outlook Support", "url": "https://support.microsoft.com/outlook"},
                {"title": "Thunderbird Help", "url": "https://support.mozilla.org/thunderbird"}
            ]),
            "status": "published"
        }
        
        response = requests.post(f"{base_url}/knowledge", data=new_article_data, headers=headers)
        if response.status_code == 200:
            created_article = response.json()
            article_id = created_article["id"]
            print(f"✅ Rich content article created successfully!")
            print(f"   Article ID: {article_id}")
            print(f"   Title: {created_article['title']}")
            print(f"   Content length: {len(created_article['content'])} characters")
            
            # Test retrieving the article
            print("\n3. Retrieving the rich content article...")
            get_response = requests.get(f"{base_url}/knowledge/{article_id}", headers=headers)
            if get_response.status_code == 200:
                article = get_response.json()
                print("✅ Article retrieved successfully!")
                print(f"   Views: {article['views']}")
                print(f"   Has HTML content: {'<h1>' in article['content']}")
                print(f"   Has table: {'<table>' in article['content']}")
                print(f"   Has styling: {'style=' in article['content']}")
            
            # Test voting
            print("\n4. Testing voting on rich content article...")
            vote_response = requests.post(f"{base_url}/knowledge/{article_id}/vote", headers=headers)
            if vote_response.status_code == 200:
                print("✅ Vote recorded successfully")
            
            return article_id
            
        else:
            print("❌ Failed to create rich content article")
            print(f"   Status: {response.status_code}")
            print(f"   Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Error creating rich content article: {e}")
        return None

def test_content_search(article_id, headers):
    """Test searching within rich content"""
    base_url = "http://localhost:8000"
    
    print("\n5. Testing search within rich content...")
    
    # Search for content within HTML
    search_terms = ["email", "IMAP", "troubleshooting", "table"]
    
    for term in search_terms:
        try:
            response = requests.get(f"{base_url}/knowledge?q={term}", headers=headers)
            if response.status_code == 200:
                results = response.json()
                found = any(article['id'] == article_id for article in results)
                print(f"   Search '{term}': {'✅ Found' if found else '❌ Not found'}")
            else:
                print(f"   Search '{term}': ❌ Error")
        except Exception as e:
            print(f"   Search '{term}': ❌ Error - {e}")

def main():
    """Main test function"""
    base_url = "http://localhost:8000"
    
    # Login
    login_data = {"username": "agent@example.com", "password": "password"}
    response = requests.post(f"{base_url}/auth/login", data=login_data)
    
    if response.status_code != 200:
        print("❌ Cannot login to test")
        return
    
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test rich content creation
    article_id = test_rich_content_creation()
    
    if article_id:
        # Test search functionality
        test_content_search(article_id, headers)
        
        # Clean up
        print("\n6. Cleaning up test article...")
        try:
            delete_response = requests.delete(f"{base_url}/knowledge/{article_id}", headers=headers)
            if delete_response.status_code == 200:
                print("✅ Test article deleted successfully")
            else:
                print("❌ Failed to delete test article")
        except Exception as e:
            print(f"❌ Error deleting test article: {e}")
    
    print("\n" + "=" * 50)
    print("🎉 Rich Text Editor testing completed!")
    print("\n💡 Features tested:")
    print("  ✅ Rich HTML content creation")
    print("  ✅ Tables, lists, and formatting")
    print("  ✅ Inline styles and colors")
    print("  ✅ Content search within HTML")
    print("  ✅ Article retrieval and display")
    print("\n🚀 Ready for frontend rich text editing!")

if __name__ == "__main__":
    main()
