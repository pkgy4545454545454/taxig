"""
TaxiG Chat API Tests - Iteration 5
Tests for real-time chat between client and driver during active rides
"""
import pytest
import requests
import os
import time
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CLIENT_EMAIL = "jean.dupont@test.com"
CLIENT_PASSWORD = "test123"
DRIVER_CODE = "TAXI001"
DRIVER_PASSWORD = "chauffeur123"


class TestChatAPI:
    """Chat API endpoint tests"""
    
    @pytest.fixture(scope="class")
    def client_token(self):
        """Get client authentication token"""
        response = requests.post(f"{BASE_URL}/api/client/login", json={
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD
        })
        assert response.status_code == 200, f"Client login failed: {response.text}"
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def driver_token(self):
        """Get driver authentication token"""
        response = requests.post(f"{BASE_URL}/api/chauffeur/login", json={
            "code_chauffeur": DRIVER_CODE,
            "password": DRIVER_PASSWORD
        })
        assert response.status_code == 200, f"Driver login failed: {response.text}"
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def active_course_id(self, client_token, driver_token):
        """Get or create an active course for testing chat"""
        # First check if there's an existing active course
        headers = {"Authorization": f"Bearer {driver_token}"}
        response = requests.get(f"{BASE_URL}/api/chauffeur/commandes", headers=headers, params={"status": "assigned"})
        if response.status_code == 200:
            courses = response.json()  # API returns list directly
            if courses and isinstance(courses, list) and len(courses) > 0:
                return courses[0]["course_id"]
        
        # Check for in_progress courses
        response = requests.get(f"{BASE_URL}/api/chauffeur/commandes", headers=headers, params={"status": "in_progress"})
        if response.status_code == 200:
            courses = response.json()
            if courses and isinstance(courses, list) and len(courses) > 0:
                return courses[0]["course_id"]
        
        # If no active course, we'll use the known test course ID
        return "b04c5492-3017-40bd-949c-0d6ed2cb8ca9"
    
    def test_client_login(self):
        """Test client can login"""
        response = requests.post(f"{BASE_URL}/api/client/login", json={
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        print(f"✓ Client login successful: {data['user'].get('prenom', '')} {data['user'].get('nom', '')}")
    
    def test_driver_login(self):
        """Test driver can login"""
        response = requests.post(f"{BASE_URL}/api/chauffeur/login", json={
            "code_chauffeur": DRIVER_CODE,
            "password": DRIVER_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        print(f"✓ Driver login successful: {data['user'].get('prenom', '')} {data['user'].get('nom', '')}")
    
    def test_send_message_as_client(self, client_token, active_course_id):
        """Test client can send a chat message"""
        headers = {"Authorization": f"Bearer {client_token}"}
        test_message = f"Test message from client at {time.time()}"
        
        response = requests.post(
            f"{BASE_URL}/api/chat/{active_course_id}/send",
            headers=headers,
            json={"message": test_message}
        )
        
        # May return 400 if course is not active
        if response.status_code == 400:
            print(f"⚠ Course not active for chat: {response.json().get('detail')}")
            pytest.skip("Course not in active state for chat")
        
        assert response.status_code == 200, f"Send message failed: {response.text}"
        data = response.json()
        assert "id" in data
        assert data["sender_type"] == "client"
        assert data["message"] == test_message
        assert "sender_name" in data
        assert "created_at" in data
        print(f"✓ Client sent message: {test_message[:30]}...")
        return data["id"]
    
    def test_send_message_as_driver(self, driver_token, active_course_id):
        """Test driver can send a chat message"""
        headers = {"Authorization": f"Bearer {driver_token}"}
        test_message = f"Test message from driver at {time.time()}"
        
        response = requests.post(
            f"{BASE_URL}/api/chat/{active_course_id}/send",
            headers=headers,
            json={"message": test_message}
        )
        
        if response.status_code == 400:
            print(f"⚠ Course not active for chat: {response.json().get('detail')}")
            pytest.skip("Course not in active state for chat")
        
        assert response.status_code == 200, f"Send message failed: {response.text}"
        data = response.json()
        assert "id" in data
        assert data["sender_type"] == "chauffeur"
        assert data["message"] == test_message
        assert "sender_name" in data
        print(f"✓ Driver sent message: {test_message[:30]}...")
    
    def test_get_messages_as_client(self, client_token, active_course_id):
        """Test client can retrieve chat messages"""
        headers = {"Authorization": f"Bearer {client_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/chat/{active_course_id}/messages",
            headers=headers
        )
        
        assert response.status_code == 200, f"Get messages failed: {response.text}"
        data = response.json()
        assert "messages" in data
        messages = data["messages"]
        print(f"✓ Client retrieved {len(messages)} messages")
        
        # Verify message structure
        if messages:
            msg = messages[0]
            assert "id" in msg
            assert "sender_type" in msg
            assert "sender_name" in msg
            assert "message" in msg
            assert "created_at" in msg
    
    def test_get_messages_as_driver(self, driver_token, active_course_id):
        """Test driver can retrieve chat messages"""
        headers = {"Authorization": f"Bearer {driver_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/chat/{active_course_id}/messages",
            headers=headers
        )
        
        assert response.status_code == 200, f"Get messages failed: {response.text}"
        data = response.json()
        assert "messages" in data
        print(f"✓ Driver retrieved {len(data['messages'])} messages")
    
    def test_get_unread_count_as_client(self, client_token, active_course_id):
        """Test client can get unread message count"""
        headers = {"Authorization": f"Bearer {client_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/chat/{active_course_id}/unread",
            headers=headers
        )
        
        assert response.status_code == 200, f"Get unread failed: {response.text}"
        data = response.json()
        assert "unread" in data
        assert isinstance(data["unread"], int)
        print(f"✓ Client unread count: {data['unread']}")
    
    def test_get_unread_count_as_driver(self, driver_token, active_course_id):
        """Test driver can get unread message count"""
        headers = {"Authorization": f"Bearer {driver_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/chat/{active_course_id}/unread",
            headers=headers
        )
        
        assert response.status_code == 200, f"Get unread failed: {response.text}"
        data = response.json()
        assert "unread" in data
        assert isinstance(data["unread"], int)
        print(f"✓ Driver unread count: {data['unread']}")
    
    def test_messages_marked_as_read(self, client_token, driver_token, active_course_id):
        """Test that messages are marked as read when fetched by other party"""
        # Driver sends a message
        driver_headers = {"Authorization": f"Bearer {driver_token}"}
        test_message = f"Read test message {time.time()}"
        
        send_response = requests.post(
            f"{BASE_URL}/api/chat/{active_course_id}/send",
            headers=driver_headers,
            json={"message": test_message}
        )
        
        if send_response.status_code == 400:
            pytest.skip("Course not in active state for chat")
        
        # Check client's unread count before reading
        client_headers = {"Authorization": f"Bearer {client_token}"}
        unread_before = requests.get(
            f"{BASE_URL}/api/chat/{active_course_id}/unread",
            headers=client_headers
        ).json().get("unread", 0)
        
        # Client fetches messages (should mark as read)
        requests.get(
            f"{BASE_URL}/api/chat/{active_course_id}/messages",
            headers=client_headers
        )
        
        # Check unread count after reading
        unread_after = requests.get(
            f"{BASE_URL}/api/chat/{active_course_id}/unread",
            headers=client_headers
        ).json().get("unread", 0)
        
        assert unread_after == 0, f"Messages not marked as read: {unread_after} unread"
        print(f"✓ Messages marked as read (before: {unread_before}, after: {unread_after})")
    
    def test_chat_requires_active_course(self, client_token):
        """Test that chat returns 400 for completed courses"""
        headers = {"Authorization": f"Bearer {client_token}"}
        
        # Get a completed course
        response = requests.get(f"{BASE_URL}/api/client/courses", headers=headers)
        if response.status_code == 200:
            courses = response.json()  # API returns list directly
            if isinstance(courses, list):
                completed_courses = [c for c in courses if c.get("status") == "completed"]
            else:
                completed_courses = [c for c in courses.get("courses", []) if c.get("status") == "completed"]
            
            if completed_courses:
                completed_id = completed_courses[0]["id"]
                
                # Try to send message to completed course
                send_response = requests.post(
                    f"{BASE_URL}/api/chat/{completed_id}/send",
                    headers=headers,
                    json={"message": "Test"}
                )
                
                assert send_response.status_code == 400, f"Expected 400 for completed course, got {send_response.status_code}"
                print(f"✓ Chat correctly blocked for completed course")
            else:
                print("⚠ No completed courses found to test")
        else:
            print("⚠ Could not fetch courses to test completed state")
    
    def test_message_validation(self, client_token, active_course_id):
        """Test message validation - empty message should fail"""
        headers = {"Authorization": f"Bearer {client_token}"}
        
        # Empty message
        response = requests.post(
            f"{BASE_URL}/api/chat/{active_course_id}/send",
            headers=headers,
            json={"message": ""}
        )
        
        assert response.status_code == 422, f"Expected 422 for empty message, got {response.status_code}"
        print("✓ Empty message correctly rejected")
    
    def test_unauthorized_access(self, active_course_id):
        """Test that unauthenticated requests are rejected"""
        # No auth header
        response = requests.get(f"{BASE_URL}/api/chat/{active_course_id}/messages")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Unauthorized access correctly rejected")
    
    def test_nonexistent_course(self, client_token):
        """Test that chat returns 404 for non-existent course"""
        headers = {"Authorization": f"Bearer {client_token}"}
        fake_course_id = str(uuid.uuid4())
        
        response = requests.post(
            f"{BASE_URL}/api/chat/{fake_course_id}/send",
            headers=headers,
            json={"message": "Test"}
        )
        
        assert response.status_code == 404, f"Expected 404 for non-existent course, got {response.status_code}"
        print("✓ Non-existent course correctly returns 404")


class TestChatFlow:
    """End-to-end chat flow tests"""
    
    @pytest.fixture(scope="class")
    def tokens(self):
        """Get both client and driver tokens"""
        client_resp = requests.post(f"{BASE_URL}/api/client/login", json={
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD
        })
        driver_resp = requests.post(f"{BASE_URL}/api/chauffeur/login", json={
            "code_chauffeur": DRIVER_CODE,
            "password": DRIVER_PASSWORD
        })
        
        return {
            "client": client_resp.json().get("access_token"),
            "driver": driver_resp.json().get("access_token")
        }
    
    def test_full_chat_conversation(self, tokens):
        """Test a full chat conversation between client and driver"""
        # Find an active course
        driver_headers = {"Authorization": f"Bearer {tokens['driver']}"}
        client_headers = {"Authorization": f"Bearer {tokens['client']}"}
        
        # Check for active courses
        response = requests.get(
            f"{BASE_URL}/api/chauffeur/commandes",
            headers=driver_headers,
            params={"status": "assigned"}
        )
        
        courses = response.json() if response.status_code == 200 else []
        
        if not courses or not isinstance(courses, list) or len(courses) == 0:
            response = requests.get(
                f"{BASE_URL}/api/chauffeur/commandes",
                headers=driver_headers,
                params={"status": "in_progress"}
            )
            courses = response.json() if response.status_code == 200 else []
        
        if not courses or not isinstance(courses, list) or len(courses) == 0:
            # Use known test course
            course_id = "b04c5492-3017-40bd-949c-0d6ed2cb8ca9"
        else:
            course_id = courses[0]["course_id"]
        
        print(f"Testing chat on course: {course_id}")
        
        # Client sends message
        msg1_resp = requests.post(
            f"{BASE_URL}/api/chat/{course_id}/send",
            headers=client_headers,
            json={"message": "Bonjour, où êtes-vous?"}
        )
        
        if msg1_resp.status_code == 400:
            print(f"⚠ Course not active: {msg1_resp.json().get('detail')}")
            pytest.skip("No active course for chat test")
        
        assert msg1_resp.status_code == 200
        
        # Driver checks unread
        unread_resp = requests.get(
            f"{BASE_URL}/api/chat/{course_id}/unread",
            headers=driver_headers
        )
        assert unread_resp.status_code == 200
        assert unread_resp.json()["unread"] >= 1
        
        # Driver reads messages
        msgs_resp = requests.get(
            f"{BASE_URL}/api/chat/{course_id}/messages",
            headers=driver_headers
        )
        assert msgs_resp.status_code == 200
        
        # Driver replies
        msg2_resp = requests.post(
            f"{BASE_URL}/api/chat/{course_id}/send",
            headers=driver_headers,
            json={"message": "J'arrive dans 2 minutes!"}
        )
        assert msg2_resp.status_code == 200
        
        # Client checks unread
        client_unread = requests.get(
            f"{BASE_URL}/api/chat/{course_id}/unread",
            headers=client_headers
        )
        assert client_unread.status_code == 200
        assert client_unread.json()["unread"] >= 1
        
        # Client reads messages
        client_msgs = requests.get(
            f"{BASE_URL}/api/chat/{course_id}/messages",
            headers=client_headers
        )
        assert client_msgs.status_code == 200
        messages = client_msgs.json()["messages"]
        
        # Verify conversation
        assert len(messages) >= 2
        print(f"✓ Full conversation test passed with {len(messages)} messages")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
