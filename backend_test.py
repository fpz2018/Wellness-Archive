#!/usr/bin/env python3
"""
Backend API Testing for Blog Article Creation Feature
Tests the /api/blog/create endpoint and related functionality
"""

import requests
import json
import os
from datetime import datetime
import uuid

# Get backend URL from frontend .env
BACKEND_URL = "https://naturo-docs.preview.emergentagent.com/api"

def test_api_health():
    """Test if the API is accessible"""
    try:
        response = requests.get(f"{BACKEND_URL}/")
        print(f"✓ API Health Check: {response.status_code} - {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"✗ API Health Check Failed: {e}")
        return False

def test_get_documents():
    """Get existing documents to use for blog creation testing"""
    try:
        response = requests.get(f"{BACKEND_URL}/documents")
        if response.status_code == 200:
            documents = response.json()
            print(f"✓ Found {len(documents)} documents in database")
            
            # Show first few documents for reference
            for i, doc in enumerate(documents[:3]):
                print(f"  Document {i+1}: {doc['id']} - {doc['title']} ({doc['category']})")
            
            return documents
        else:
            print(f"✗ Failed to get documents: {response.status_code}")
            return []
    except Exception as e:
        print(f"✗ Error getting documents: {e}")
        return []

def create_test_document():
    """Create a test document for blog creation testing"""
    try:
        test_doc = {
            "title": "Spijsverteringsproblemen en Orthomoleculaire Behandeling",
            "category": "artikel",
            "file_type": "text",
            "content": """
Spijsverteringsproblemen zijn een veelvoorkomend probleem in de moderne samenleving. 
Veel mensen ervaren symptomen zoals opgeblazen gevoel, buikpijn, en onregelmatige stoelgang.

Orthomoleculaire behandeling biedt een natuurlijke benadering voor deze problemen:

1. Probiotica voor darmflora herstel
2. Digestieve enzymen voor betere vertering
3. L-glutamine voor darmwand herstel
4. Omega-3 vetzuren voor ontstekingsremming

Supplementen zoals zink, magnesium en B-vitaminen kunnen ook helpen bij het herstel 
van de spijsvertering. Een holistische aanpak met voeding, supplementen en leefstijl 
is vaak het meest effectief.
            """,
            "tags": ["spijsvertering", "orthomoleculair", "probiotica", "supplementen"],
            "references": []
        }
        
        response = requests.post(f"{BACKEND_URL}/documents", json=test_doc)
        if response.status_code == 200:
            doc = response.json()
            print(f"✓ Created test document: {doc['id']} - {doc['title']}")
            return doc
        else:
            print(f"✗ Failed to create test document: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"✗ Error creating test document: {e}")
        return None

def test_blog_creation_single_document(document_ids):
    """Test blog creation with single document"""
    print("\n=== Testing Blog Creation with Single Document ===")
    
    if not document_ids:
        print("✗ No documents available for testing")
        return False
    
    try:
        blog_request = {
            "document_ids": [document_ids[0]],
            "title": "Natuurlijke Oplossingen voor Spijsverteringsproblemen",
            "category": "Blog Articles",
            "custom_instructions": None
        }
        
        print(f"Sending request to: {BACKEND_URL}/blog/create")
        print(f"Request data: {json.dumps(blog_request, indent=2)}")
        
        response = requests.post(f"{BACKEND_URL}/blog/create", json=blog_request)
        
        print(f"Response status: {response.status_code}")
        print(f"Response headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            result = response.json()
            print("✓ Blog creation successful!")
            print(f"  Blog ID: {result.get('blog_id')}")
            print(f"  Success: {result.get('success')}")
            
            # Check blog content
            blog_article = result.get('blog_article', {})
            if blog_article:
                print(f"  Title: {blog_article.get('title')}")
                print(f"  Content length: {len(blog_article.get('content', ''))}")
                print(f"  Meta title: {blog_article.get('meta_title')}")
                print(f"  Meta description: {blog_article.get('meta_description')}")
                print(f"  URL slug: {blog_article.get('url_slug')}")
                print(f"  Tags: {blog_article.get('tags')}")
                
                # Check if local SEO keywords are included
                content = blog_article.get('content', '').lower()
                local_keywords = ["fysio zeist", "fysiopraktijk zeist", "orthomoleculair praktijk zeist"]
                seo_check = any(keyword in content for keyword in local_keywords)
                print(f"  Local SEO keywords present: {'✓' if seo_check else '✗'}")
                
                return True
            else:
                print("✗ No blog article in response")
                return False
        else:
            print(f"✗ Blog creation failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"✗ Error in blog creation test: {e}")
        return False

def test_blog_creation_multiple_documents(document_ids):
    """Test blog creation with multiple documents"""
    print("\n=== Testing Blog Creation with Multiple Documents ===")
    
    if len(document_ids) < 2:
        print("✗ Need at least 2 documents for multiple document test")
        return False
    
    try:
        blog_request = {
            "document_ids": document_ids[:2],  # Use first 2 documents
            "title": "Uitgebreide Gids voor Orthomoleculaire Gezondheid",
            "category": "Blog Articles",
            "custom_instructions": "Maak een uitgebreide gids die beide onderwerpen combineert met praktische tips"
        }
        
        response = requests.post(f"{BACKEND_URL}/blog/create", json=blog_request)
        
        if response.status_code == 200:
            result = response.json()
            print("✓ Multiple document blog creation successful!")
            
            blog_article = result.get('blog_article', {})
            if blog_article:
                content_length = len(blog_article.get('content', ''))
                print(f"  Content length: {content_length} characters")
                print(f"  Source documents: {len(blog_article.get('source_document_ids', []))}")
                
                # Check if content is substantial (should be longer with multiple docs)
                if content_length > 1000:
                    print("✓ Content appears substantial")
                    return True
                else:
                    print("✗ Content seems too short for multiple documents")
                    return False
            else:
                print("✗ No blog article in response")
                return False
        else:
            print(f"✗ Multiple document blog creation failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"✗ Error in multiple document test: {e}")
        return False

def test_blog_creation_with_custom_instructions(document_ids):
    """Test blog creation with custom instructions"""
    print("\n=== Testing Blog Creation with Custom Instructions ===")
    
    if not document_ids:
        print("✗ No documents available for testing")
        return False
    
    try:
        blog_request = {
            "document_ids": [document_ids[0]],
            "title": "Praktische Tips voor Dagelijkse Gezondheid",
            "category": "Blog Articles",
            "custom_instructions": "Focus op praktische, dagelijkse tips die lezers direct kunnen toepassen. Gebruik veel bullet points en concrete voorbeelden. Maak het toegankelijk voor beginners."
        }
        
        response = requests.post(f"{BACKEND_URL}/blog/create", json=blog_request)
        
        if response.status_code == 200:
            result = response.json()
            print("✓ Blog creation with custom instructions successful!")
            
            blog_article = result.get('blog_article', {})
            if blog_article:
                content = blog_article.get('content', '')
                
                # Check if custom instructions were followed
                has_bullet_points = '•' in content or '-' in content or '*' in content
                has_practical_focus = any(word in content.lower() for word in ['praktisch', 'dagelijks', 'tip', 'direct'])
                
                print(f"  Has bullet points/lists: {'✓' if has_bullet_points else '✗'}")
                print(f"  Has practical focus: {'✓' if has_practical_focus else '✗'}")
                
                return has_bullet_points or has_practical_focus
            else:
                print("✗ No blog article in response")
                return False
        else:
            print(f"✗ Custom instructions blog creation failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"✗ Error in custom instructions test: {e}")
        return False

def test_blog_creation_error_handling():
    """Test error handling with invalid document IDs"""
    print("\n=== Testing Error Handling ===")
    
    try:
        # Test with non-existent document ID
        blog_request = {
            "document_ids": ["non-existent-id-12345"],
            "title": "Test Blog",
            "category": "Blog Articles"
        }
        
        response = requests.post(f"{BACKEND_URL}/blog/create", json=blog_request)
        
        if response.status_code == 404:
            print("✓ Correctly handled non-existent document ID with 404")
            return True
        elif response.status_code >= 400:
            print(f"✓ Correctly returned error status: {response.status_code}")
            return True
        else:
            print(f"✗ Should have returned error for invalid document ID, got: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"✗ Error in error handling test: {e}")
        return False

def test_blog_database_persistence(blog_id):
    """Test if created blog is properly saved to database"""
    print("\n=== Testing Database Persistence ===")
    
    if not blog_id:
        print("✗ No blog ID provided for persistence test")
        return False
    
    try:
        # Try to retrieve the created blog from documents endpoint
        response = requests.get(f"{BACKEND_URL}/documents/{blog_id}")
        
        if response.status_code == 200:
            blog_doc = response.json()
            print("✓ Blog successfully retrieved from database")
            
            # Verify it's a blog article
            if blog_doc.get('file_type') == 'blog_article':
                print("✓ Document correctly marked as blog_article")
                
                # Check required fields
                required_fields = ['meta_title', 'meta_description', 'url_slug', 'source_document_ids']
                missing_fields = [field for field in required_fields if not blog_doc.get(field)]
                
                if not missing_fields:
                    print("✓ All required blog fields present")
                    return True
                else:
                    print(f"✗ Missing required fields: {missing_fields}")
                    return False
            else:
                print(f"✗ Document type is {blog_doc.get('file_type')}, expected 'blog_article'")
                return False
        else:
            print(f"✗ Failed to retrieve blog from database: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"✗ Error in database persistence test: {e}")
        return False

def test_claude_integration():
    """Test if Claude Sonnet 4 integration is working"""
    print("\n=== Testing Claude Integration ===")
    
    try:
        # Test with a simple chat request to verify Claude is working
        chat_request = {
            "session_id": str(uuid.uuid4()),
            "message": "Test bericht voor Claude integratie",
            "context_type": "general"
        }
        
        response = requests.post(f"{BACKEND_URL}/chat", json=chat_request)
        
        if response.status_code == 200:
            result = response.json()
            if result.get('response'):
                print("✓ Claude integration working - chat endpoint responds")
                return True
            else:
                print("✗ Claude integration issue - no response content")
                return False
        else:
            print(f"✗ Claude integration failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"✗ Error testing Claude integration: {e}")
        return False

def main():
    """Run all blog creation tests"""
    print("🧪 Starting Backend API Tests for Blog Article Creation")
    print("=" * 60)
    
    # Track test results
    test_results = {}
    
    # Test API health
    test_results['api_health'] = test_api_health()
    
    if not test_results['api_health']:
        print("❌ API not accessible, stopping tests")
        return test_results
    
    # Test Claude integration first
    test_results['claude_integration'] = test_claude_integration()
    
    # Get existing documents
    documents = test_get_documents()
    
    # Create test document if no documents exist
    if not documents:
        print("\n📝 No existing documents found, creating test document...")
        test_doc = create_test_document()
        if test_doc:
            documents = [test_doc]
    
    if not documents:
        print("❌ No documents available for testing")
        return test_results
    
    # Extract document IDs
    document_ids = [doc['id'] for doc in documents]
    
    # Run blog creation tests
    test_results['single_document'] = test_blog_creation_single_document(document_ids)
    test_results['multiple_documents'] = test_blog_creation_multiple_documents(document_ids)
    test_results['custom_instructions'] = test_blog_creation_with_custom_instructions(document_ids)
    test_results['error_handling'] = test_blog_creation_error_handling()
    
    # Test database persistence if we have a successful blog creation
    blog_id = None
    if test_results['single_document']:
        # Try to get the blog ID from a successful creation
        try:
            blog_request = {
                "document_ids": [document_ids[0]],
                "title": "Test Blog for Persistence Check",
                "category": "Blog Articles"
            }
            response = requests.post(f"{BACKEND_URL}/blog/create", json=blog_request)
            if response.status_code == 200:
                blog_id = response.json().get('blog_id')
        except:
            pass
    
    test_results['database_persistence'] = test_blog_database_persistence(blog_id)
    
    # Print summary
    print("\n" + "=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)
    
    passed = sum(1 for result in test_results.values() if result)
    total = len(test_results)
    
    for test_name, result in test_results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name.replace('_', ' ').title()}: {status}")
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Blog creation feature is working correctly.")
    else:
        print("⚠️  Some tests failed. Check the details above.")
    
    return test_results

if __name__ == "__main__":
    results = main()