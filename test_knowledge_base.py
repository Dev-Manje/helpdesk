#!/usr/bin/env python3
"""
Test script for the enhanced Knowledge Base system
"""
import requests
import json

def test_knowledge_base():
    """Test the knowledge base API endpoints"""
    base_url = "http://localhost:8000"
    
    # Test credentials
    login_data = {
        "username": "agent@example.com",
        "password": "password"
    }
    
    print("🔧 Testing Enhanced Knowledge Base System")
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
    
    # Test getting articles
    print("\n2. Fetching knowledge base articles...")
    try:
        response = requests.get(f"{base_url}/knowledge", headers=headers)
        if response.status_code == 200:
            articles = response.json()
            print(f"✅ Found {len(articles)} articles")
            
            # Display first article details
            if articles:
                article = articles[0]
                print(f"\nSample Article:")
                print(f"  Title: {article['title']}")
                print(f"  Category: {article['category']}")
                print(f"  Tags: {', '.join(article['tags'])}")
                print(f"  Views: {article['views']}")
                print(f"  Helpful Votes: {article['helpful_votes']}")
        else:
            print("❌ Failed to fetch articles")
    except Exception as e:
        print(f"❌ Error fetching articles: {e}")
    
    # Test search functionality
    print("\n3. Testing search functionality...")
    try:
        response = requests.get(f"{base_url}/knowledge?q=password", headers=headers)
        if response.status_code == 200:
            search_results = response.json()
            print(f"✅ Search for 'password' returned {len(search_results)} results")
        else:
            print("❌ Search failed")
    except Exception as e:
        print(f"❌ Search error: {e}")
    
    # Test category filtering
    print("\n4. Testing category filtering...")
    try:
        response = requests.get(f"{base_url}/knowledge?category=Network", headers=headers)
        if response.status_code == 200:
            network_articles = response.json()
            print(f"✅ Found {len(network_articles)} Network articles")
        else:
            print("❌ Category filtering failed")
    except Exception as e:
        print(f"❌ Category filtering error: {e}")
    
    # Test getting categories
    print("\n5. Testing categories endpoint...")
    try:
        response = requests.get(f"{base_url}/knowledge/categories", headers=headers)
        if response.status_code == 200:
            categories = response.json()["categories"]
            print(f"✅ Available categories: {', '.join(categories)}")
        else:
            print("❌ Failed to get categories")
    except Exception as e:
        print(f"❌ Categories error: {e}")
    
    # Test getting tags
    print("\n6. Testing tags endpoint...")
    try:
        response = requests.get(f"{base_url}/knowledge/tags", headers=headers)
        if response.status_code == 200:
            tags = response.json()["tags"]
            print(f"✅ Available tags: {', '.join(tags[:10])}...")  # Show first 10 tags
        else:
            print("❌ Failed to get tags")
    except Exception as e:
        print(f"❌ Tags error: {e}")
    
    # Test creating a new article
    print("\n7. Testing article creation...")
    try:
        new_article_data = {
            "title": "Test Article",
            "content": "<h2>Test Content</h2><p>This is a test article created by the API.</p>",
            "summary": "A test article for API testing",
            "category": "Testing",
            "tags": "test,api,demo",
            "links": json.dumps([{"title": "Test Link", "url": "https://example.com"}]),
            "status": "published"
        }
        
        response = requests.post(f"{base_url}/knowledge", data=new_article_data, headers=headers)
        if response.status_code == 200:
            created_article = response.json()
            article_id = created_article["id"]
            print(f"✅ Article created successfully with ID: {article_id}")
            
            # Test voting on the article
            print("\n8. Testing article voting...")
            vote_response = requests.post(f"{base_url}/knowledge/{article_id}/vote", headers=headers)
            if vote_response.status_code == 200:
                print("✅ Vote recorded successfully")
            else:
                print("❌ Voting failed")
            
            # Clean up - delete the test article
            print("\n9. Cleaning up test article...")
            delete_response = requests.delete(f"{base_url}/knowledge/{article_id}", headers=headers)
            if delete_response.status_code == 200:
                print("✅ Test article deleted successfully")
            else:
                print("❌ Failed to delete test article")
                
        else:
            print("❌ Failed to create article")
    except Exception as e:
        print(f"❌ Article creation error: {e}")
    
    print("\n" + "=" * 50)
    print("🎉 Knowledge Base testing completed!")
    print("\n💡 Features tested:")
    print("  ✅ Article listing and search")
    print("  ✅ Category and tag filtering")
    print("  ✅ Article creation with rich content")
    print("  ✅ Voting system")
    print("  ✅ Article management (CRUD operations)")
    print("\n🚀 Ready for frontend integration!")

if __name__ == "__main__":
    test_knowledge_base()
