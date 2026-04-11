"""
TaxiG API Backend Tests - Comprehensive test suite for all endpoints
Tests: Health, Client Auth, Chauffeur Auth, Admin Auth, Course Booking, Active Chauffeurs
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://taxig-redesign.preview.emergentagent.com')

# Test credentials from requirements
TEST_CLIENT = {"email": "jean.dupont@test.com", "password": "test123"}
TEST_CHAUFFEUR = {"code_chauffeur": "TAXI001", "password": "chauffeur123"}
TEST_ADMIN = {"username": "naim", "password": "admin123"}


class TestHealthEndpoint:
    """Health check endpoint tests"""
    
    def test_health_endpoint(self):
        """Test /api/health returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✓ Health endpoint working")

    def test_root_endpoint(self):
        """Test /api/ returns API info"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "TaxiG" in data.get("message", "")
        print("✓ Root endpoint working")


class TestPublicEndpoints:
    """Public endpoints that don't require authentication"""
    
    def test_get_active_chauffeurs(self):
        """Test /api/chauffeurs/actifs returns list of active drivers"""
        response = requests.get(f"{BASE_URL}/api/chauffeurs/actifs")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Active chauffeurs endpoint working - {len(data)} chauffeurs found")
        
        # Verify structure if chauffeurs exist
        if len(data) > 0:
            chauffeur = data[0]
            assert "id" in chauffeur
            assert "position" in chauffeur
            assert "lat" in chauffeur["position"]
            assert "lng" in chauffeur["position"]
            print(f"✓ Chauffeur data structure valid")


class TestClientAuth:
    """Client authentication and registration tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test client"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_client_register_new_user(self):
        """Test client registration with new user"""
        unique_email = f"test_{uuid.uuid4().hex[:8]}@test.com"
        response = self.session.post(f"{BASE_URL}/api/client/register", json={
            "nom": "Test",
            "prenom": "User",
            "email": unique_email,
            "password": "testpass123",
            "mode_paiement": "cash"
        })
        # Either 200 (success) or 400 (email exists)
        assert response.status_code in [200, 400]
        if response.status_code == 200:
            data = response.json()
            assert "access_token" in data
            assert "user" in data
            print(f"✓ Client registration successful for {unique_email}")
        else:
            print(f"✓ Client registration endpoint working (email may exist)")
    
    def test_client_login_valid_credentials(self):
        """Test client login with valid credentials"""
        # First ensure the test client exists
        self.session.post(f"{BASE_URL}/api/client/register", json={
            "nom": "Dupont",
            "prenom": "Jean",
            "email": TEST_CLIENT["email"],
            "password": TEST_CLIENT["password"],
            "mode_paiement": "cash"
        })
        
        # Now login
        response = self.session.post(f"{BASE_URL}/api/client/login", json=TEST_CLIENT)
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_CLIENT["email"]
        print(f"✓ Client login successful for {TEST_CLIENT['email']}")
        return data["access_token"]
    
    def test_client_login_invalid_credentials(self):
        """Test client login with invalid credentials"""
        response = self.session.post(f"{BASE_URL}/api/client/login", json={
            "email": "invalid@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Client login correctly rejects invalid credentials")
    
    def test_client_profile_authenticated(self):
        """Test getting client profile with valid token"""
        # Login first
        login_response = self.session.post(f"{BASE_URL}/api/client/login", json=TEST_CLIENT)
        if login_response.status_code != 200:
            pytest.skip("Client login failed - skipping profile test")
        
        token = login_response.json()["access_token"]
        
        # Get profile
        response = self.session.get(
            f"{BASE_URL}/api/client/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == TEST_CLIENT["email"]
        print("✓ Client profile endpoint working")
    
    def test_client_profile_unauthenticated(self):
        """Test getting client profile without token"""
        response = self.session.get(f"{BASE_URL}/api/client/me")
        assert response.status_code == 401
        print("✓ Client profile correctly requires authentication")


class TestChauffeurAuth:
    """Chauffeur authentication tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_chauffeur_register_new(self):
        """Test chauffeur registration"""
        unique_code = f"TEST{uuid.uuid4().hex[:4].upper()}"
        response = self.session.post(f"{BASE_URL}/api/chauffeur/register", json={
            "nom": "Test",
            "prenom": "Chauffeur",
            "code_chauffeur": unique_code,
            "email": f"chauffeur_{unique_code.lower()}@test.com",
            "password": "testpass123"
        })
        assert response.status_code in [200, 400]
        if response.status_code == 200:
            data = response.json()
            assert "access_token" in data
            print(f"✓ Chauffeur registration successful for {unique_code}")
        else:
            print("✓ Chauffeur registration endpoint working")
    
    def test_chauffeur_login_valid(self):
        """Test chauffeur login with valid credentials"""
        # First ensure test chauffeur exists
        self.session.post(f"{BASE_URL}/api/chauffeur/register", json={
            "nom": "Test",
            "prenom": "Driver",
            "code_chauffeur": TEST_CHAUFFEUR["code_chauffeur"],
            "email": "taxi001@test.com",
            "password": TEST_CHAUFFEUR["password"]
        })
        
        # Login
        response = self.session.post(f"{BASE_URL}/api/chauffeur/login", json=TEST_CHAUFFEUR)
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["code_chauffeur"] == TEST_CHAUFFEUR["code_chauffeur"]
        print(f"✓ Chauffeur login successful for {TEST_CHAUFFEUR['code_chauffeur']}")
        return data["access_token"]
    
    def test_chauffeur_login_invalid(self):
        """Test chauffeur login with invalid credentials"""
        response = self.session.post(f"{BASE_URL}/api/chauffeur/login", json={
            "code_chauffeur": "INVALID",
            "password": "wrongpass"
        })
        assert response.status_code == 401
        print("✓ Chauffeur login correctly rejects invalid credentials")
    
    def test_chauffeur_profile(self):
        """Test chauffeur profile endpoint"""
        # Login first
        login_response = self.session.post(f"{BASE_URL}/api/chauffeur/login", json=TEST_CHAUFFEUR)
        if login_response.status_code != 200:
            pytest.skip("Chauffeur login failed")
        
        token = login_response.json()["access_token"]
        
        response = self.session.get(
            f"{BASE_URL}/api/chauffeur/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["code_chauffeur"] == TEST_CHAUFFEUR["code_chauffeur"]
        print("✓ Chauffeur profile endpoint working")
    
    def test_chauffeur_pointer(self):
        """Test chauffeur pointer (go online/offline)"""
        # Login first
        login_response = self.session.post(f"{BASE_URL}/api/chauffeur/login", json=TEST_CHAUFFEUR)
        if login_response.status_code != 200:
            pytest.skip("Chauffeur login failed")
        
        token = login_response.json()["access_token"]
        
        response = self.session.post(
            f"{BASE_URL}/api/chauffeur/pointer",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert data["status"] in ["online", "offline"]
        print(f"✓ Chauffeur pointer working - status: {data['status']}")


class TestAdminAuth:
    """Admin authentication tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_admin_register_and_login(self):
        """Test admin registration and login"""
        # First try to register (may already exist)
        self.session.post(f"{BASE_URL}/api/admin/register", json=TEST_ADMIN)
        
        # Login
        response = self.session.post(f"{BASE_URL}/api/admin/login", json=TEST_ADMIN)
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        print(f"✓ Admin login successful for {TEST_ADMIN['username']}")
        return data["access_token"]
    
    def test_admin_login_invalid(self):
        """Test admin login with invalid credentials"""
        response = self.session.post(f"{BASE_URL}/api/admin/login", json={
            "username": "invalid",
            "password": "wrongpass"
        })
        assert response.status_code == 401
        print("✓ Admin login correctly rejects invalid credentials")
    
    def test_admin_dashboard(self):
        """Test admin dashboard endpoint"""
        # Register and login
        self.session.post(f"{BASE_URL}/api/admin/register", json=TEST_ADMIN)
        login_response = self.session.post(f"{BASE_URL}/api/admin/login", json=TEST_ADMIN)
        if login_response.status_code != 200:
            pytest.skip("Admin login failed")
        
        token = login_response.json()["access_token"]
        
        response = self.session.get(
            f"{BASE_URL}/api/admin/dashboard",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "stats" in data
        assert "total_chauffeurs" in data["stats"]
        assert "total_clients" in data["stats"]
        print(f"✓ Admin dashboard working - {data['stats']['total_chauffeurs']} chauffeurs, {data['stats']['total_clients']} clients")
    
    def test_admin_get_chauffeurs(self):
        """Test admin get chauffeurs list"""
        self.session.post(f"{BASE_URL}/api/admin/register", json=TEST_ADMIN)
        login_response = self.session.post(f"{BASE_URL}/api/admin/login", json=TEST_ADMIN)
        if login_response.status_code != 200:
            pytest.skip("Admin login failed")
        
        token = login_response.json()["access_token"]
        
        response = self.session.get(
            f"{BASE_URL}/api/admin/chauffeurs",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Admin chauffeurs list working - {len(data)} chauffeurs")
    
    def test_admin_get_clients(self):
        """Test admin get clients list"""
        self.session.post(f"{BASE_URL}/api/admin/register", json=TEST_ADMIN)
        login_response = self.session.post(f"{BASE_URL}/api/admin/login", json=TEST_ADMIN)
        if login_response.status_code != 200:
            pytest.skip("Admin login failed")
        
        token = login_response.json()["access_token"]
        
        response = self.session.get(
            f"{BASE_URL}/api/admin/clients",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Admin clients list working - {len(data)} clients")


class TestCourseBooking:
    """Course booking and estimation tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session and login client"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Ensure test client exists and login
        self.session.post(f"{BASE_URL}/api/client/register", json={
            "nom": "Dupont",
            "prenom": "Jean",
            "email": TEST_CLIENT["email"],
            "password": TEST_CLIENT["password"],
            "mode_paiement": "cash"
        })
        
        login_response = self.session.post(f"{BASE_URL}/api/client/login", json=TEST_CLIENT)
        if login_response.status_code == 200:
            self.token = login_response.json()["access_token"]
        else:
            self.token = None
    
    def test_course_estimate(self):
        """Test course price estimation"""
        if not self.token:
            pytest.skip("Client login failed")
        
        response = self.session.post(
            f"{BASE_URL}/api/course/estimate",
            headers={"Authorization": f"Bearer {self.token}"},
            json={
                "pickup_lat": 48.8566,
                "pickup_lng": 2.3522,
                "pickup_address": "Paris, France",
                "destination_lat": 48.8606,
                "destination_lng": 2.3376,
                "destination_address": "Louvre, Paris",
                "distance_km": 1.5,
                "duration_minutes": 10
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "base_fare" in data
        assert "distance_fare" in data
        assert "estimated_total" in data
        assert data["estimated_total"] > 0
        print(f"✓ Course estimate working - Total: {data['estimated_total']}€")
    
    def test_course_estimate_long_distance(self):
        """Test course estimation for long distance (Paris to Lyon)"""
        if not self.token:
            pytest.skip("Client login failed")
        
        response = self.session.post(
            f"{BASE_URL}/api/course/estimate",
            headers={"Authorization": f"Bearer {self.token}"},
            json={
                "pickup_lat": 48.8566,
                "pickup_lng": 2.3522,
                "pickup_address": "Paris, France",
                "destination_lat": 45.7640,
                "destination_lng": 4.8357,
                "destination_address": "Lyon, France",
                "distance_km": 465,
                "duration_minutes": 280
            }
        )
        assert response.status_code == 200
        data = response.json()
        # Price should be: 6.30 (base) + 465 * 3.20 (distance) + traffic wait
        # Expected around 1500€
        assert data["estimated_total"] > 1000
        print(f"✓ Long distance estimate working - Paris-Lyon: {data['estimated_total']}€")
    
    def test_course_book(self):
        """Test course booking"""
        if not self.token:
            pytest.skip("Client login failed")
        
        response = self.session.post(
            f"{BASE_URL}/api/course/book",
            headers={"Authorization": f"Bearer {self.token}"},
            json={
                "pickup_lat": 48.8566,
                "pickup_lng": 2.3522,
                "pickup_address": "Paris, France",
                "destination_lat": 48.8606,
                "destination_lng": 2.3376,
                "destination_address": "Louvre, Paris",
                "distance_km": 1.5,
                "duration_minutes": 10,
                "payment_method": "cash"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "course_id" in data
        assert "commande_no" in data
        assert "prix_estime" in data
        print(f"✓ Course booking working - Order: {data['commande_no']}, Price: {data['prix_estime']}€")


class TestClientFeatures:
    """Client-specific features tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session and login client"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Ensure test client exists and login
        self.session.post(f"{BASE_URL}/api/client/register", json={
            "nom": "Dupont",
            "prenom": "Jean",
            "email": TEST_CLIENT["email"],
            "password": TEST_CLIENT["password"],
            "mode_paiement": "cash"
        })
        
        login_response = self.session.post(f"{BASE_URL}/api/client/login", json=TEST_CLIENT)
        if login_response.status_code == 200:
            self.token = login_response.json()["access_token"]
        else:
            self.token = None
    
    def test_client_courses_history(self):
        """Test client courses history"""
        if not self.token:
            pytest.skip("Client login failed")
        
        response = self.session.get(
            f"{BASE_URL}/api/client/courses",
            headers={"Authorization": f"Bearer {self.token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Client courses history working - {len(data)} courses")
    
    def test_client_stats(self):
        """Test client statistics"""
        if not self.token:
            pytest.skip("Client login failed")
        
        response = self.session.get(
            f"{BASE_URL}/api/client/stats",
            headers={"Authorization": f"Bearer {self.token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "total_courses" in data
        assert "total_spent" in data
        assert "total_km" in data
        print(f"✓ Client stats working - {data['total_courses']} courses, {data['total_spent']}€ spent")
    
    def test_client_roulette(self):
        """Test client roulette game"""
        if not self.token:
            pytest.skip("Client login failed")
        
        response = self.session.post(
            f"{BASE_URL}/api/client/roulette",
            headers={"Authorization": f"Bearer {self.token}"}
        )
        # Either 200 (success) or 400 (already played today)
        assert response.status_code in [200, 400]
        if response.status_code == 200:
            data = response.json()
            assert "won" in data
            print(f"✓ Client roulette working - Won: {data['won']}")
        else:
            print("✓ Client roulette working (already played today)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
