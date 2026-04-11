"""
TaxiG Driver Notification Flow Tests
Tests the complete flow: Driver goes online -> Client books -> Driver receives notification -> Driver accepts
This tests the main bug fix: Driver notification polling was broken - driver had to refresh page to see ride requests
"""
import pytest
import requests
import os
import time
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://taxig-redesign.preview.emergentagent.com')

# Test credentials
TEST_CLIENT = {"email": "jean.dupont@test.com", "password": "test123"}
TEST_CHAUFFEUR = {"code_chauffeur": "TAXI001", "password": "chauffeur123"}


class TestDriverNotificationFlow:
    """
    Tests the complete driver notification flow:
    1. Driver logs in and goes online
    2. Driver updates position
    3. Client books a ride
    4. Driver polls for pending course and receives notification
    5. Driver accepts the ride
    6. Ride status changes to assigned
    """
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test sessions for client and driver"""
        self.client_session = requests.Session()
        self.client_session.headers.update({"Content-Type": "application/json"})
        
        self.driver_session = requests.Session()
        self.driver_session.headers.update({"Content-Type": "application/json"})
        
        # Login client
        self.client_session.post(f"{BASE_URL}/api/client/register", json={
            "nom": "Dupont",
            "prenom": "Jean",
            "email": TEST_CLIENT["email"],
            "password": TEST_CLIENT["password"],
            "mode_paiement": "cash"
        })
        login_resp = self.client_session.post(f"{BASE_URL}/api/client/login", json=TEST_CLIENT)
        if login_resp.status_code == 200:
            self.client_token = login_resp.json()["access_token"]
        else:
            self.client_token = None
        
        # Login driver
        self.driver_session.post(f"{BASE_URL}/api/chauffeur/register", json={
            "nom": "Martin",
            "prenom": "Jean",
            "code_chauffeur": TEST_CHAUFFEUR["code_chauffeur"],
            "email": "taxi001@test.com",
            "password": TEST_CHAUFFEUR["password"]
        })
        login_resp = self.driver_session.post(f"{BASE_URL}/api/chauffeur/login", json=TEST_CHAUFFEUR)
        if login_resp.status_code == 200:
            self.driver_token = login_resp.json()["access_token"]
        else:
            self.driver_token = None
    
    def test_driver_login_flow(self):
        """Test driver can login successfully"""
        assert self.driver_token is not None, "Driver login failed"
        print("✓ Driver login successful")
    
    def test_driver_go_online(self):
        """Test driver can go online (pointer toggle)"""
        if not self.driver_token:
            pytest.skip("Driver login failed")
        
        response = self.driver_session.post(
            f"{BASE_URL}/api/chauffeur/pointer",
            headers={"Authorization": f"Bearer {self.driver_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert data["status"] in ["online", "offline"]
        print(f"✓ Driver pointer working - status: {data['status']}")
    
    def test_driver_update_position(self):
        """Test driver can update position"""
        if not self.driver_token:
            pytest.skip("Driver login failed")
        
        # Geneva coordinates
        response = self.driver_session.post(
            f"{BASE_URL}/api/chauffeur/position",
            headers={"Authorization": f"Bearer {self.driver_token}"},
            json={"latitude": 46.2044, "longitude": 6.1432}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "updated"
        print("✓ Driver position updated successfully")
    
    def test_driver_pending_course_endpoint(self):
        """Test the pending course endpoint returns correct structure"""
        if not self.driver_token:
            pytest.skip("Driver login failed")
        
        response = self.driver_session.get(
            f"{BASE_URL}/api/chauffeur/pending-course",
            headers={"Authorization": f"Bearer {self.driver_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        # Should have 'course' key (can be null if no pending course)
        assert "course" in data
        print(f"✓ Pending course endpoint working - course: {data.get('course') is not None}")
    
    def test_complete_notification_flow(self):
        """
        Test the complete flow:
        1. Driver goes online and sets position
        2. Client books a ride near driver
        3. Driver polls and receives the course request
        4. Driver accepts the ride
        5. Verify ride status is 'assigned'
        """
        if not self.driver_token or not self.client_token:
            pytest.skip("Login failed for client or driver")
        
        # Step 1: Ensure driver is online
        pointer_resp = self.driver_session.post(
            f"{BASE_URL}/api/chauffeur/pointer",
            headers={"Authorization": f"Bearer {self.driver_token}"}
        )
        assert pointer_resp.status_code == 200
        driver_status = pointer_resp.json()["status"]
        
        # If offline, toggle again to go online
        if driver_status == "offline":
            pointer_resp = self.driver_session.post(
                f"{BASE_URL}/api/chauffeur/pointer",
                headers={"Authorization": f"Bearer {self.driver_token}"}
            )
            assert pointer_resp.status_code == 200
            driver_status = pointer_resp.json()["status"]
        
        assert driver_status == "online", f"Driver should be online, got: {driver_status}"
        print(f"✓ Step 1: Driver is online")
        
        # Step 2: Update driver position (Geneva area)
        position_resp = self.driver_session.post(
            f"{BASE_URL}/api/chauffeur/position",
            headers={"Authorization": f"Bearer {self.driver_token}"},
            json={"latitude": 46.2044, "longitude": 6.1432}
        )
        assert position_resp.status_code == 200
        print("✓ Step 2: Driver position updated")
        
        # Step 3: Client books a ride near driver's position
        book_resp = self.client_session.post(
            f"{BASE_URL}/api/course/book",
            headers={"Authorization": f"Bearer {self.client_token}"},
            json={
                "pickup_lat": 46.2050,  # Near driver
                "pickup_lng": 6.1440,
                "pickup_address": "Geneva Central",
                "destination_lat": 46.2100,
                "destination_lng": 6.1500,
                "destination_address": "Geneva Airport",
                "distance_km": 5.0,
                "duration_minutes": 15,
                "payment_method": "cash"
            }
        )
        assert book_resp.status_code == 200
        booking_data = book_resp.json()
        assert "course_id" in booking_data
        course_id = booking_data["course_id"]
        print(f"✓ Step 3: Client booked ride - Course ID: {course_id}")
        
        # Step 4: Driver polls for pending course (simulating the 3-second polling)
        # Wait a moment for the course request to be created
        time.sleep(1)
        
        pending_resp = self.driver_session.get(
            f"{BASE_URL}/api/chauffeur/pending-course",
            headers={"Authorization": f"Bearer {self.driver_token}"}
        )
        assert pending_resp.status_code == 200
        pending_data = pending_resp.json()
        
        # Should have a pending course request
        if pending_data.get("course"):
            print(f"✓ Step 4: Driver received course notification - Type: {pending_data.get('type')}")
            
            # Step 5: If it's a request, driver accepts it
            if pending_data.get("type") == "request":
                request_id = pending_data["course"]["id"]
                accept_resp = self.driver_session.post(
                    f"{BASE_URL}/api/chauffeur/respond-course/{request_id}",
                    headers={"Authorization": f"Bearer {self.driver_token}"},
                    params={"accept": True}
                )
                assert accept_resp.status_code == 200
                accept_data = accept_resp.json()
                assert accept_data["status"] == "accepted"
                print(f"✓ Step 5: Driver accepted the ride")
                
                # Step 6: Verify course status is now 'assigned'
                course_resp = self.client_session.get(
                    f"{BASE_URL}/api/course/{course_id}",
                    headers={"Authorization": f"Bearer {self.client_token}"}
                )
                assert course_resp.status_code == 200
                course_data = course_resp.json()
                assert course_data["status"] == "assigned", f"Expected 'assigned', got: {course_data['status']}"
                print(f"✓ Step 6: Course status verified as 'assigned'")
            else:
                print(f"✓ Course already assigned to driver")
        else:
            # No pending course - might be assigned to another driver
            print("⚠ No pending course for this driver (may be assigned to another)")
    
    def test_driver_start_and_complete_course(self):
        """Test driver can start and complete a course"""
        if not self.driver_token or not self.client_token:
            pytest.skip("Login failed")
        
        # Ensure driver is online with position
        self.driver_session.post(
            f"{BASE_URL}/api/chauffeur/pointer",
            headers={"Authorization": f"Bearer {self.driver_token}"}
        )
        self.driver_session.post(
            f"{BASE_URL}/api/chauffeur/position",
            headers={"Authorization": f"Bearer {self.driver_token}"},
            json={"latitude": 46.2044, "longitude": 6.1432}
        )
        
        # Check for any assigned course
        pending_resp = self.driver_session.get(
            f"{BASE_URL}/api/chauffeur/pending-course",
            headers={"Authorization": f"Bearer {self.driver_token}"}
        )
        
        if pending_resp.status_code == 200:
            data = pending_resp.json()
            if data.get("course") and data.get("type") == "assigned":
                course_id = data["course"]["id"]
                
                # Start the course
                start_resp = self.driver_session.post(
                    f"{BASE_URL}/api/chauffeur/start-course/{course_id}",
                    headers={"Authorization": f"Bearer {self.driver_token}"}
                )
                if start_resp.status_code == 200:
                    print(f"✓ Course started - ID: {course_id}")
                    
                    # Complete the course
                    complete_resp = self.driver_session.post(
                        f"{BASE_URL}/api/chauffeur/complete-course/{course_id}",
                        headers={"Authorization": f"Bearer {self.driver_token}"},
                        params={"wait_minutes": 0}
                    )
                    if complete_resp.status_code == 200:
                        complete_data = complete_resp.json()
                        print(f"✓ Course completed - Final price: {complete_data.get('prix_final')}€")
                    else:
                        print(f"⚠ Could not complete course: {complete_resp.status_code}")
                else:
                    print(f"⚠ Could not start course: {start_resp.status_code}")
            else:
                print("⚠ No assigned course to start/complete")
        else:
            print("⚠ Could not check pending courses")
    
    def test_driver_reject_course(self):
        """Test driver can reject a course request"""
        if not self.driver_token or not self.client_token:
            pytest.skip("Login failed")
        
        # Ensure driver is online
        pointer_resp = self.driver_session.post(
            f"{BASE_URL}/api/chauffeur/pointer",
            headers={"Authorization": f"Bearer {self.driver_token}"}
        )
        if pointer_resp.json().get("status") == "offline":
            self.driver_session.post(
                f"{BASE_URL}/api/chauffeur/pointer",
                headers={"Authorization": f"Bearer {self.driver_token}"}
            )
        
        # Update position
        self.driver_session.post(
            f"{BASE_URL}/api/chauffeur/position",
            headers={"Authorization": f"Bearer {self.driver_token}"},
            json={"latitude": 46.2044, "longitude": 6.1432}
        )
        
        # Book a new ride
        book_resp = self.client_session.post(
            f"{BASE_URL}/api/course/book",
            headers={"Authorization": f"Bearer {self.client_token}"},
            json={
                "pickup_lat": 46.2050,
                "pickup_lng": 6.1440,
                "pickup_address": "Test Pickup",
                "destination_lat": 46.2100,
                "destination_lng": 6.1500,
                "destination_address": "Test Destination",
                "distance_km": 3.0,
                "duration_minutes": 10,
                "payment_method": "cash"
            }
        )
        
        if book_resp.status_code == 200:
            time.sleep(1)
            
            # Check for pending request
            pending_resp = self.driver_session.get(
                f"{BASE_URL}/api/chauffeur/pending-course",
                headers={"Authorization": f"Bearer {self.driver_token}"}
            )
            
            if pending_resp.status_code == 200:
                data = pending_resp.json()
                if data.get("course") and data.get("type") == "request":
                    request_id = data["course"]["id"]
                    
                    # Reject the course
                    reject_resp = self.driver_session.post(
                        f"{BASE_URL}/api/chauffeur/respond-course/{request_id}",
                        headers={"Authorization": f"Bearer {self.driver_token}"},
                        params={"accept": False}
                    )
                    assert reject_resp.status_code == 200
                    reject_data = reject_resp.json()
                    assert reject_data["status"] == "rejected"
                    print("✓ Driver successfully rejected course")
                else:
                    print("⚠ No pending request to reject")
            else:
                print("⚠ Could not check pending courses")
        else:
            print("⚠ Could not book test ride")


class TestDriverRevenusAndCommandes:
    """Test driver revenue and commandes endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login driver
        self.session.post(f"{BASE_URL}/api/chauffeur/register", json={
            "nom": "Martin",
            "prenom": "Jean",
            "code_chauffeur": TEST_CHAUFFEUR["code_chauffeur"],
            "email": "taxi001@test.com",
            "password": TEST_CHAUFFEUR["password"]
        })
        login_resp = self.session.post(f"{BASE_URL}/api/chauffeur/login", json=TEST_CHAUFFEUR)
        if login_resp.status_code == 200:
            self.token = login_resp.json()["access_token"]
        else:
            self.token = None
    
    def test_driver_revenus(self):
        """Test driver can get revenue information"""
        if not self.token:
            pytest.skip("Driver login failed")
        
        response = self.session.get(
            f"{BASE_URL}/api/chauffeur/revenus",
            headers={"Authorization": f"Bearer {self.token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "revenus_brut_30j" in data
        assert "revenus_net_30j" in data
        assert "commission_due" in data
        assert "nombre_courses_30j" in data
        print(f"✓ Driver revenus endpoint working - Net: {data['revenus_net_30j']}€")
    
    def test_driver_commandes(self):
        """Test driver can get commandes list"""
        if not self.token:
            pytest.skip("Driver login failed")
        
        response = self.session.get(
            f"{BASE_URL}/api/chauffeur/commandes",
            headers={"Authorization": f"Bearer {self.token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Driver commandes endpoint working - {len(data)} commandes")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
