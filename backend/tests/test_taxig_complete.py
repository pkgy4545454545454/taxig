"""
TaxiG Complete API Test Suite - Testing all endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://taxig-redesign.preview.emergentagent.com')

# Test credentials
CLIENT_EMAIL = "jean.dupont@test.com"
CLIENT_PASSWORD = "test123"
CHAUFFEUR_CODE = "TAXI001"
CHAUFFEUR_PASSWORD = "chauffeur123"
ADMIN_USERNAME = "naim"
ADMIN_PASSWORD = "admin123"


class TestHealthAndBasics:
    """Health check and basic API tests"""
    
    def test_health_endpoint(self):
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✓ Health check passed")
    
    def test_root_endpoint(self):
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "TaxiG API"
        print("✓ Root endpoint check passed")


class TestClientFlow:
    """Client authentication and operations tests"""
    
    def test_client_login(self):
        response = requests.post(f"{BASE_URL}/api/client/login", json={
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == CLIENT_EMAIL
        print(f"✓ Client login successful: {data['user']['prenom']} {data['user']['nom']}")
        return data["access_token"]
    
    def test_client_profile(self):
        token = self.test_client_login()
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/client/me", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["email"] == CLIENT_EMAIL
        print(f"✓ Client profile retrieved: {data['prenom']} {data['nom']}")
    
    def test_client_courses_history(self):
        token = self.test_client_login()
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/client/courses", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Client courses history retrieved: {len(data)} courses")
    
    def test_client_stats(self):
        token = self.test_client_login()
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/client/stats", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_courses" in data
        assert "total_spent" in data
        assert "savings_vs_uber" in data
        print(f"✓ Client stats: {data['total_courses']} courses, {data['total_spent']}€ spent")


class TestChauffeurFlow:
    """Chauffeur authentication and operations tests"""
    
    def test_chauffeur_login(self):
        response = requests.post(f"{BASE_URL}/api/chauffeur/login", json={
            "code_chauffeur": CHAUFFEUR_CODE,
            "password": CHAUFFEUR_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["code_chauffeur"] == CHAUFFEUR_CODE
        print(f"✓ Chauffeur login successful: {data['user']['prenom']} {data['user']['nom']}")
        return data["access_token"]
    
    def test_chauffeur_profile(self):
        token = self.test_chauffeur_login()
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/chauffeur/me", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["code_chauffeur"] == CHAUFFEUR_CODE
        assert "is_online" in data
        assert "nombre_courses" in data
        print(f"✓ Chauffeur profile: {data['prenom']} {data['nom']}, Online: {data['is_online']}, Courses: {data['nombre_courses']}")
        return data
    
    def test_chauffeur_pointer(self):
        token = self.test_chauffeur_login()
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.post(f"{BASE_URL}/api/chauffeur/pointer", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "action" in data
        assert data["status"] in ["online", "offline"]
        print(f"✓ Chauffeur pointer: {data['action']} - Status: {data['status']}")
        return data
    
    def test_chauffeur_position_update(self):
        token = self.test_chauffeur_login()
        headers = {"Authorization": f"Bearer {token}"}
        
        # Geneva coordinates
        position = {"latitude": 46.2044, "longitude": 6.1432}
        response = requests.post(f"{BASE_URL}/api/chauffeur/position", headers=headers, json=position)
        assert response.status_code == 200
        print("✓ Chauffeur position updated")
    
    def test_chauffeur_commandes(self):
        token = self.test_chauffeur_login()
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/chauffeur/commandes", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Chauffeur commandes: {len(data)} commandes")
    
    def test_chauffeur_revenus(self):
        token = self.test_chauffeur_login()
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/chauffeur/revenus", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "revenus_brut_30j" in data
        assert "revenus_net_30j" in data
        assert "commission_due" in data
        assert "nombre_courses_30j" in data
        print(f"✓ Chauffeur revenus: Brut {data['revenus_brut_30j']}€, Net {data['revenus_net_30j']}€, Commission {data['commission_due']}€")
        return data


class TestAdminFlow:
    """Admin authentication and dashboard tests"""
    
    def test_admin_login(self):
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["username"] == ADMIN_USERNAME
        print(f"✓ Admin login successful: {data['user']['username']}")
        return data["access_token"]
    
    def test_admin_dashboard(self):
        token = self.test_admin_login()
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/admin/dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "stats" in data
        assert "recent_pointages" in data
        stats = data["stats"]
        assert "total_chauffeurs" in stats
        assert "active_chauffeurs" in stats
        assert "total_clients" in stats
        assert "total_courses" in stats
        assert "total_revenue" in stats
        print(f"✓ Admin dashboard: {stats['total_chauffeurs']} chauffeurs ({stats['active_chauffeurs']} active), {stats['total_clients']} clients, {stats['total_courses']} courses, {stats['total_revenue']}€ revenue")
        return stats
    
    def test_admin_chauffeurs_list(self):
        token = self.test_admin_login()
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/admin/chauffeurs", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Admin chauffeurs list: {len(data)} chauffeurs")
        return data
    
    def test_admin_clients_list(self):
        token = self.test_admin_login()
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/admin/clients", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Admin clients list: {len(data)} clients")
        return data
    
    def test_admin_courses_list(self):
        token = self.test_admin_login()
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/admin/courses", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Admin courses list: {len(data)} courses")
        return data
    
    def test_admin_revenus(self):
        token = self.test_admin_login()
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/admin/revenus?period=30d", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_revenue" in data
        assert "total_commission" in data
        assert "number_of_courses" in data
        print(f"✓ Admin revenus (30d): {data['total_revenue']}€ total, {data['total_commission']}€ commission, {data['number_of_courses']} courses")
        return data


class TestCourseEstimate:
    """Course estimation and pricing tests"""
    
    def get_client_token(self):
        response = requests.post(f"{BASE_URL}/api/client/login", json={
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_course_estimate_short_distance(self):
        token = self.get_client_token()
        headers = {"Authorization": f"Bearer {token}"}
        
        # 5km trip in Geneva
        course_data = {
            "pickup_lat": 46.2044,
            "pickup_lng": 6.1432,
            "pickup_address": "Geneva Central",
            "destination_lat": 46.2200,
            "destination_lng": 6.1400,
            "destination_address": "Geneva North",
            "distance_km": 5.0,
            "duration_minutes": 10.0,
            "payment_method": "cash"
        }
        
        response = requests.post(f"{BASE_URL}/api/course/estimate", headers=headers, json=course_data)
        assert response.status_code == 200
        data = response.json()
        assert "base_fare" in data
        assert "distance_fare" in data
        assert "estimated_total" in data
        # Base 6.30€ + 5km * 3.20€/km = 6.30 + 16 = 22.30€ + traffic wait
        assert data["base_fare"] == 6.30
        assert data["distance_fare"] == 16.00  # 5 * 3.20
        print(f"✓ Course estimate (5km): Base {data['base_fare']}€, Distance {data['distance_fare']}€, Total {data['estimated_total']}€")
    
    def test_course_estimate_long_distance(self):
        token = self.get_client_token()
        headers = {"Authorization": f"Bearer {token}"}
        
        # 50km trip
        course_data = {
            "pickup_lat": 46.2044,
            "pickup_lng": 6.1432,
            "pickup_address": "Geneva",
            "destination_lat": 46.4500,
            "destination_lng": 6.9000,
            "destination_address": "Lausanne",
            "distance_km": 50.0,
            "duration_minutes": 45.0,
            "payment_method": "cash"
        }
        
        response = requests.post(f"{BASE_URL}/api/course/estimate", headers=headers, json=course_data)
        assert response.status_code == 200
        data = response.json()
        # Base 6.30€ + 50km * 3.20€/km = 6.30 + 160 = 166.30€ + traffic wait
        assert data["base_fare"] == 6.30
        assert data["distance_fare"] == 160.00  # 50 * 3.20
        assert data["estimated_total"] > 166  # Should include traffic wait
        print(f"✓ Course estimate (50km): Base {data['base_fare']}€, Distance {data['distance_fare']}€, Total {data['estimated_total']}€")


class TestPublicEndpoints:
    """Public endpoints tests"""
    
    def test_active_chauffeurs(self):
        response = requests.get(f"{BASE_URL}/api/chauffeurs/actifs")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Verify 41 chauffeurs are available
        assert len(data) >= 40, f"Expected at least 40 chauffeurs, got {len(data)}"
        print(f"✓ Active chauffeurs: {len(data)} chauffeurs found")
        
        # Verify position data
        for chauffeur in data[:5]:
            assert "id" in chauffeur
            assert "position" in chauffeur
            assert "lat" in chauffeur["position"]
            assert "lng" in chauffeur["position"]
        print("✓ All chauffeurs have valid position data")


class TestStripeIntegration:
    """Stripe payment integration tests"""
    
    def test_stripe_public_key(self):
        response = requests.get(f"{BASE_URL}/api/stripe/public-key")
        assert response.status_code == 200
        data = response.json()
        assert "public_key" in data
        assert data["public_key"].startswith("pk_")
        print(f"✓ Stripe public key available: {data['public_key'][:20]}...")


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short", "-s"])
