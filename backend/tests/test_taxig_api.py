"""
TaxiG API Backend Tests
Tests for: Authentication, Course booking, Price calculation, Chauffeur operations
"""
import pytest
import requests
import os
import uuid
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://taxig-redesign.preview.emergentagent.com')

# Test credentials from review request
CLIENT_EMAIL = "jean.dupont@test.com"
CLIENT_PASSWORD = "test123"
CHAUFFEUR_CODE = "TAXI001"
CHAUFFEUR_PASSWORD = "chauffeur123"

# Pricing constants (from server.py)
BASE_FARE = 6.30
PRICE_PER_KM = 3.20


class TestHealthAndRoot:
    """Health check and root endpoint tests"""
    
    def test_health_endpoint(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✓ Health endpoint OK")
    
    def test_root_endpoint(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "TaxiG API"
        assert "version" in data
        print("✓ Root endpoint OK")


class TestClientAuthentication:
    """Client login and registration tests"""
    
    def test_client_login_with_test_credentials(self):
        """Test client login with provided credentials"""
        response = requests.post(f"{BASE_URL}/api/client/login", json={
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD
        })
        
        # Check if test user exists
        if response.status_code == 401:
            # Create test user first
            register_response = requests.post(f"{BASE_URL}/api/client/register", json={
                "nom": "Dupont",
                "prenom": "Jean",
                "email": CLIENT_EMAIL,
                "password": CLIENT_PASSWORD,
                "mode_paiement": "cash"
            })
            if register_response.status_code in [200, 201]:
                # Retry login
                response = requests.post(f"{BASE_URL}/api/client/login", json={
                    "email": CLIENT_EMAIL,
                    "password": CLIENT_PASSWORD
                })
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert "user" in data
        print(f"✓ Client login OK - User: {data['user'].get('prenom', 'Unknown')}")
        return data["access_token"]
    
    def test_client_login_invalid_credentials(self):
        """Test client login with wrong credentials"""
        response = requests.post(f"{BASE_URL}/api/client/login", json={
            "email": "wrong@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid credentials correctly rejected")


class TestChauffeurAuthentication:
    """Chauffeur login and registration tests"""
    
    def test_chauffeur_login_with_test_credentials(self):
        """Test chauffeur login with provided credentials"""
        response = requests.post(f"{BASE_URL}/api/chauffeur/login", json={
            "code_chauffeur": CHAUFFEUR_CODE,
            "password": CHAUFFEUR_PASSWORD
        })
        
        # Check if test chauffeur exists
        if response.status_code == 401:
            # Create test chauffeur first
            register_response = requests.post(f"{BASE_URL}/api/chauffeur/register", json={
                "nom": "Martin",
                "prenom": "Pierre",
                "code_chauffeur": CHAUFFEUR_CODE,
                "email": "taxi001@test.com",
                "password": CHAUFFEUR_PASSWORD
            })
            if register_response.status_code in [200, 201]:
                # Retry login
                response = requests.post(f"{BASE_URL}/api/chauffeur/login", json={
                    "code_chauffeur": CHAUFFEUR_CODE,
                    "password": CHAUFFEUR_PASSWORD
                })
        
        assert response.status_code == 200, f"Chauffeur login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        print(f"✓ Chauffeur login OK - Code: {data['user'].get('code_chauffeur', 'Unknown')}")
        return data["access_token"]
    
    def test_chauffeur_login_invalid_credentials(self):
        """Test chauffeur login with wrong credentials"""
        response = requests.post(f"{BASE_URL}/api/chauffeur/login", json={
            "code_chauffeur": "WRONG001",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid chauffeur credentials correctly rejected")


class TestPriceCalculation:
    """
    BUG 1 TEST: Price calculation verification
    Formula: 6.30€ base + 3.20€/km + traffic fees
    Paris-Lyon (465km) should be ~1510€
    """
    
    @pytest.fixture
    def client_token(self):
        """Get client auth token"""
        response = requests.post(f"{BASE_URL}/api/client/login", json={
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD
        })
        if response.status_code == 401:
            # Register first
            requests.post(f"{BASE_URL}/api/client/register", json={
                "nom": "Dupont", "prenom": "Jean",
                "email": CLIENT_EMAIL, "password": CLIENT_PASSWORD,
                "mode_paiement": "cash"
            })
            response = requests.post(f"{BASE_URL}/api/client/login", json={
                "email": CLIENT_EMAIL, "password": CLIENT_PASSWORD
            })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Cannot authenticate client")
    
    def test_price_calculation_paris_lyon_465km(self, client_token):
        """
        BUG 1: Test Paris-Lyon (465km) price calculation
        Expected: ~1510€ (6.30 + 465*3.20 + traffic)
        """
        # Paris coordinates (pickup)
        paris_lat = 48.8566
        paris_lng = 2.3522
        
        # Lyon coordinates (destination)
        lyon_lat = 45.7640
        lyon_lng = 4.8357
        
        # Distance (approximately 465km by road)
        distance_km = 465.0
        duration_minutes = 280.0  # ~4.5 hours
        
        response = requests.post(
            f"{BASE_URL}/api/course/estimate",
            json={
                "pickup_lat": paris_lat,
                "pickup_lng": paris_lng,
                "pickup_address": "Paris, France",
                "destination_lat": lyon_lat,
                "destination_lng": lyon_lng,
                "destination_address": "Lyon, France",
                "distance_km": distance_km,
                "duration_minutes": duration_minutes,
                "payment_method": "cash"
            },
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        assert response.status_code == 200, f"Estimate failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "base_fare" in data
        assert "distance_fare" in data
        assert "estimated_total" in data
        
        # Verify calculations
        expected_base = 6.30
        expected_distance_fare = 465.0 * 3.20  # = 1488€
        expected_traffic = (duration_minutes * 0.1) * 0.50  # ~14€
        expected_total = expected_base + expected_distance_fare + expected_traffic
        
        print(f"✓ Paris-Lyon Price Calculation:")
        print(f"  - Distance: {distance_km} km")
        print(f"  - Base fare: {data['base_fare']}€ (expected: {expected_base}€)")
        print(f"  - Distance fare: {data['distance_fare']}€ (expected: {expected_distance_fare}€)")
        print(f"  - Total: {data['estimated_total']}€ (expected ~{expected_total}€)")
        
        # Verify base fare
        assert abs(data["base_fare"] - expected_base) < 0.01, "Base fare mismatch"
        
        # Verify distance fare (465km * 3.20€)
        assert abs(data["distance_fare"] - expected_distance_fare) < 0.01, "Distance fare mismatch"
        
        # BUG 1 CHECK: Total should be ~1510€, NOT ~24€
        assert data["estimated_total"] > 1400, f"BUG 1 NOT FIXED: Price too low ({data['estimated_total']}€), should be ~1510€"
        assert data["estimated_total"] < 1600, f"Price unexpectedly high ({data['estimated_total']}€)"
        
        print(f"✓ BUG 1 VERIFIED: Price correctly calculated as {data['estimated_total']}€")
    
    def test_price_calculation_short_trip(self, client_token):
        """Test short trip price calculation (5km)"""
        response = requests.post(
            f"{BASE_URL}/api/course/estimate",
            json={
                "pickup_lat": 48.8566,
                "pickup_lng": 2.3522,
                "pickup_address": "Paris Centre",
                "destination_lat": 48.8800,
                "destination_lng": 2.3600,
                "destination_address": "Paris 18ème",
                "distance_km": 5.0,
                "duration_minutes": 15.0,
                "payment_method": "cash"
            },
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # 5km: 6.30 + (5 * 3.20) + (15 * 0.1 * 0.5) = 6.30 + 16 + 0.75 = 23.05€
        expected_total = 6.30 + (5 * 3.20) + (15 * 0.1 * 0.50)
        
        assert abs(data["estimated_total"] - expected_total) < 0.5, f"Short trip price mismatch: got {data['estimated_total']}€, expected ~{expected_total}€"
        print(f"✓ Short trip (5km) price: {data['estimated_total']}€")


class TestCourseBooking:
    """Course booking flow tests"""
    
    @pytest.fixture
    def client_token(self):
        """Get client auth token"""
        response = requests.post(f"{BASE_URL}/api/client/login", json={
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD
        })
        if response.status_code == 401:
            requests.post(f"{BASE_URL}/api/client/register", json={
                "nom": "Dupont", "prenom": "Jean",
                "email": CLIENT_EMAIL, "password": CLIENT_PASSWORD,
                "mode_paiement": "cash"
            })
            response = requests.post(f"{BASE_URL}/api/client/login", json={
                "email": CLIENT_EMAIL, "password": CLIENT_PASSWORD
            })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Cannot authenticate client")
    
    def test_course_booking_flow(self, client_token):
        """Test complete course booking"""
        # Book a course
        response = requests.post(
            f"{BASE_URL}/api/course/book",
            json={
                "pickup_lat": 48.8566,
                "pickup_lng": 2.3522,
                "pickup_address": "10 Rue de Rivoli, Paris",
                "destination_lat": 48.8738,
                "destination_lng": 2.2950,
                "destination_address": "Tour Eiffel, Paris",
                "distance_km": 4.5,
                "duration_minutes": 12.0,
                "payment_method": "cash"
            },
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        assert response.status_code == 200, f"Booking failed: {response.text}"
        data = response.json()
        
        # Verify booking response
        assert "course_id" in data
        assert "commande_no" in data
        assert data["commande_no"].startswith("TG-")
        assert "prix_estime" in data
        
        print(f"✓ Course booked: {data['commande_no']} - {data['prix_estime']}€")
        return data["course_id"]
    
    def test_get_course_details(self, client_token):
        """Test retrieving course details"""
        # First book a course
        book_response = requests.post(
            f"{BASE_URL}/api/course/book",
            json={
                "pickup_lat": 48.8566,
                "pickup_lng": 2.3522,
                "pickup_address": "Paris Centre",
                "destination_lat": 48.8800,
                "destination_lng": 2.3600,
                "destination_address": "Paris Nord",
                "distance_km": 3.0,
                "duration_minutes": 10.0,
                "payment_method": "cash"
            },
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        if book_response.status_code != 200:
            pytest.skip("Cannot book course")
        
        course_id = book_response.json()["course_id"]
        
        # Get course details
        response = requests.get(
            f"{BASE_URL}/api/course/{course_id}",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["id"] == course_id
        assert "pickup_address" in data
        assert "destination_address" in data
        assert data["status"] == "pending"
        
        print(f"✓ Course details retrieved: {data['commande_no']}")


class TestChauffeurOperations:
    """Chauffeur service operations tests"""
    
    @pytest.fixture
    def chauffeur_token(self):
        """Get chauffeur auth token"""
        response = requests.post(f"{BASE_URL}/api/chauffeur/login", json={
            "code_chauffeur": CHAUFFEUR_CODE,
            "password": CHAUFFEUR_PASSWORD
        })
        if response.status_code == 401:
            requests.post(f"{BASE_URL}/api/chauffeur/register", json={
                "nom": "Martin", "prenom": "Pierre",
                "code_chauffeur": CHAUFFEUR_CODE,
                "email": "taxi001@test.com",
                "password": CHAUFFEUR_PASSWORD
            })
            response = requests.post(f"{BASE_URL}/api/chauffeur/login", json={
                "code_chauffeur": CHAUFFEUR_CODE,
                "password": CHAUFFEUR_PASSWORD
            })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Cannot authenticate chauffeur")
    
    def test_chauffeur_profile(self, chauffeur_token):
        """Test chauffeur profile retrieval"""
        response = requests.get(
            f"{BASE_URL}/api/chauffeur/me",
            headers={"Authorization": f"Bearer {chauffeur_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert "code_chauffeur" in data
        assert "is_online" in data
        
        print(f"✓ Chauffeur profile: {data.get('prenom', '')} {data.get('nom', '')} - Online: {data['is_online']}")
    
    def test_chauffeur_pointer(self, chauffeur_token):
        """Test chauffeur start/end service"""
        # Start service (pointer)
        response = requests.post(
            f"{BASE_URL}/api/chauffeur/pointer",
            headers={"Authorization": f"Bearer {chauffeur_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "status" in data
        assert "action" in data
        assert data["action"] in ["start", "end"]
        
        print(f"✓ Chauffeur pointer: {data['action']} - Status: {data['status']}")
    
    def test_chauffeur_position_update(self, chauffeur_token):
        """Test chauffeur position update"""
        # First ensure chauffeur is online
        requests.post(
            f"{BASE_URL}/api/chauffeur/pointer",
            headers={"Authorization": f"Bearer {chauffeur_token}"}
        )
        
        # Update position
        response = requests.post(
            f"{BASE_URL}/api/chauffeur/position",
            json={
                "latitude": 48.8566,
                "longitude": 2.3522
            },
            headers={"Authorization": f"Bearer {chauffeur_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "updated"
        print("✓ Chauffeur position updated")
    
    def test_chauffeur_pending_course(self, chauffeur_token):
        """Test checking for pending courses"""
        response = requests.get(
            f"{BASE_URL}/api/chauffeur/pending-course",
            headers={"Authorization": f"Bearer {chauffeur_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        # course can be None if no pending course
        assert "course" in data
        print(f"✓ Pending course check: {'Found' if data['course'] else 'None'}")


class TestPublicEndpoints:
    """Public API endpoints tests"""
    
    def test_get_active_chauffeurs(self):
        """Test retrieving active chauffeurs"""
        response = requests.get(f"{BASE_URL}/api/chauffeurs/actifs")
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        print(f"✓ Active chauffeurs: {len(data)}")
        
        # If there are active chauffeurs, verify structure
        if data:
            chauffeur = data[0]
            assert "id" in chauffeur
            assert "is_online" in chauffeur
            assert chauffeur["is_online"] == True


class TestClientStats:
    """Client statistics and history tests"""
    
    @pytest.fixture
    def client_token(self):
        """Get client auth token"""
        response = requests.post(f"{BASE_URL}/api/client/login", json={
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD
        })
        if response.status_code == 401:
            requests.post(f"{BASE_URL}/api/client/register", json={
                "nom": "Dupont", "prenom": "Jean",
                "email": CLIENT_EMAIL, "password": CLIENT_PASSWORD,
                "mode_paiement": "cash"
            })
            response = requests.post(f"{BASE_URL}/api/client/login", json={
                "email": CLIENT_EMAIL, "password": CLIENT_PASSWORD
            })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Cannot authenticate client")
    
    def test_client_courses_history(self, client_token):
        """Test client course history"""
        response = requests.get(
            f"{BASE_URL}/api/client/courses",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Client courses: {len(data)} in history")
    
    def test_client_stats(self, client_token):
        """Test client statistics"""
        response = requests.get(
            f"{BASE_URL}/api/client/stats",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "total_courses" in data
        assert "total_spent" in data
        assert "total_km" in data
        print(f"✓ Client stats: {data['total_courses']} courses, {data['total_spent']}€ spent")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
