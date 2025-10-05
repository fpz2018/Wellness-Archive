#!/usr/bin/env python3
"""
Simple Blog Creation Test
"""

import requests
import json

BACKEND_URL = "https://naturo-docs.preview.emergentagent.com/api"

def test_simple_blog_creation():
    """Test blog creation with minimal data"""
    try:
        # Get documents
        docs_response = requests.get(f'{BACKEND_URL}/documents')
        if docs_response.status_code != 200:
            print("✗ Failed to get documents")
            return False
        
        documents = docs_response.json()
        if not documents:
            print("✗ No documents found")
            return False
        
        doc_id = documents[0]['id']
        print(f"Using document: {doc_id} - {documents[0]['title']}")
        
        # Test blog creation with minimal request
        blog_request = {
            "document_ids": [doc_id],
            "title": "Test Blog",
            "category": "Blog Articles"
        }
        
        print("Sending blog creation request...")
        response = requests.post(f'{BACKEND_URL}/blog/create', json=blog_request, timeout=120)
        
        print(f"Response status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("✓ Blog creation successful!")
            print(f"  Blog ID: {result.get('blog_id')}")
            print(f"  Success: {result.get('success')}")
            
            blog_article = result.get('blog_article', {})
            if blog_article:
                print(f"  Content length: {len(blog_article.get('content', ''))}")
                print(f"  Meta title: {blog_article.get('meta_title')}")
                print(f"  URL slug: {blog_article.get('url_slug')}")
                
                # Check for local SEO keywords
                content = blog_article.get('content', '').lower()
                local_keywords = ["fysio zeist", "fysiopraktijk zeist", "orthomoleculair praktijk zeist"]
                seo_found = [kw for kw in local_keywords if kw in content]
                print(f"  Local SEO keywords found: {seo_found}")
                
                return True
            else:
                print("✗ No blog article in response")
                return False
        else:
            print(f"✗ Blog creation failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"✗ Error: {e}")
        return False

if __name__ == "__main__":
    print("🧪 Simple Blog Creation Test")
    print("=" * 40)
    
    success = test_simple_blog_creation()
    
    if success:
        print("\n✅ Blog creation is working!")
    else:
        print("\n❌ Blog creation failed!")