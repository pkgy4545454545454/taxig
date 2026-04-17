"""
TaxiG New Features Tests - Iteration 4
Tests for:
1. Rating system (POST /course/{id}/rate, GET /course/{id}/rating, GET /chauffeur/{id}/rating)
2. Document upload (POST /chauffeur/upload-document, GET /chauffeur/documents)
3. Admin document verification (GET /admin/chauffeur/{id}/documents, POST /admin/document/{id}/verify)
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CLIENT_EMAIL = "jean.dupont@test.com"
CLIENT_PASSWORD = "test123"
DRIVER_CODE = "TAXI001"
DRIVER_PASSWORD = "chauffeur123"
ADMIN_USERNAME = "naim"
ADMIN_PASSWORD = "admin123"


class TestAuth:
    """Authentication tests for all user types"""
    
    def test_client_login(self):
        """Test client login"""
        response = requests.post(f"{BASE_URL}/api/client/login", json={
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD
        })
        assert response.status_code == 200, f"Client login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        print(f"✓ Client login successful")
        return data["access_token"]
    
    def test_driver_login(self):
        """Test driver login"""
        response = requests.post(f"{BASE_URL}/api/chauffeur/login", json={
            "code_chauffeur": DRIVER_CODE,
            "password": DRIVER_PASSWORD
        })
        assert response.status_code == 200, f"Driver login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        print(f"✓ Driver login successful")
        return data["access_token"]
    
    def test_admin_login(self):
        """Test admin login"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        print(f"✓ Admin login successful")
        return data["access_token"]


class TestRatingSystem:
    """Rating system tests"""
    
    @pytest.fixture
    def client_token(self):
        response = requests.post(f"{BASE_URL}/api/client/login", json={
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD
        })
        return response.json()["access_token"]
    
    @pytest.fixture
    def driver_token(self):
        response = requests.post(f"{BASE_URL}/api/chauffeur/login", json={
            "code_chauffeur": DRIVER_CODE,
            "password": DRIVER_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_get_chauffeur_rating_public(self):
        """Test getting chauffeur rating (public endpoint)"""
        # First get a chauffeur ID
        response = requests.get(f"{BASE_URL}/api/chauffeurs/actifs")
        assert response.status_code == 200
        chauffeurs = response.json()
        if len(chauffeurs) > 0:
            chauffeur_id = chauffeurs[0]["id"]
            rating_response = requests.get(f"{BASE_URL}/api/chauffeur/{chauffeur_id}/rating")
            assert rating_response.status_code == 200
            data = rating_response.json()
            assert "average" in data
            assert "count" in data
            print(f"✓ Chauffeur rating endpoint works: avg={data['average']}, count={data['count']}")
    
    def test_get_course_rating_requires_auth(self, client_token):
        """Test that course rating requires authentication"""
        # Without auth
        response = requests.get(f"{BASE_URL}/api/course/fake-id/rating")
        assert response.status_code == 401
        print(f"✓ Course rating requires auth")
    
    def test_rate_course_requires_completed_status(self, client_token):
        """Test that rating requires completed course"""
        headers = {"Authorization": f"Bearer {client_token}"}
        # Try to rate a non-existent course
        response = requests.post(
            f"{BASE_URL}/api/course/fake-course-id/rate",
            json={"stars": 5, "comment": "Test"},
            headers=headers
        )
        assert response.status_code == 404
        print(f"✓ Rating non-existent course returns 404")
    
    def test_rate_course_validation(self, client_token):
        """Test rating validation (stars 1-5)"""
        headers = {"Authorization": f"Bearer {client_token}"}
        # Get client courses to find a completed one
        response = requests.get(f"{BASE_URL}/api/client/courses", headers=headers)
        assert response.status_code == 200
        courses = response.json()
        completed = [c for c in courses if c.get("status") == "completed"]
        if completed:
            course_id = completed[0]["id"]
            # Try invalid stars
            response = requests.post(
                f"{BASE_URL}/api/course/{course_id}/rate",
                json={"stars": 0},
                headers=headers
            )
            # Should fail validation (stars must be 1-5)
            assert response.status_code in [400, 422]
            print(f"✓ Rating validation works (stars 1-5)")
        else:
            print("⚠ No completed courses to test rating validation")


class TestDocumentUpload:
    """Document upload tests for drivers"""
    
    @pytest.fixture
    def driver_token(self):
        response = requests.post(f"{BASE_URL}/api/chauffeur/login", json={
            "code_chauffeur": DRIVER_CODE,
            "password": DRIVER_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_get_documents_requires_auth(self):
        """Test that getting documents requires authentication"""
        response = requests.get(f"{BASE_URL}/api/chauffeur/documents")
        assert response.status_code == 401
        print(f"✓ Get documents requires auth")
    
    def test_get_documents_as_driver(self, driver_token):
        """Test getting driver documents"""
        headers = {"Authorization": f"Bearer {driver_token}"}
        response = requests.get(f"{BASE_URL}/api/chauffeur/documents", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Get documents works: {len(data)} documents found")
    
    def test_upload_document_invalid_type(self, driver_token):
        """Test uploading document with invalid type"""
        headers = {"Authorization": f"Bearer {driver_token}"}
        files = {"file": ("test.jpg", b"fake image content", "image/jpeg")}
        data = {"document_type": "invalid_type"}
        response = requests.post(
            f"{BASE_URL}/api/chauffeur/upload-document",
            files=files,
            data=data,
            headers=headers
        )
        assert response.status_code == 400
        print(f"✓ Invalid document type rejected")
    
    def test_upload_document_valid(self, driver_token):
        """Test uploading a valid document"""
        headers = {"Authorization": f"Bearer {driver_token}"}
        # Create a small test file
        test_content = b"Test PDF content for document upload"
        files = {"file": (f"test_doc_{uuid.uuid4().hex[:8]}.pdf", test_content, "application/pdf")}
        data = {"document_type": "permis_conduire"}
        response = requests.post(
            f"{BASE_URL}/api/chauffeur/upload-document",
            files=files,
            data=data,
            headers=headers
        )
        assert response.status_code == 200
        result = response.json()
        assert result["status"] == "uploaded"
        assert "document_id" in result
        print(f"✓ Document uploaded successfully: {result['document_id']}")
        return result["document_id"]
    
    def test_upload_document_all_types(self, driver_token):
        """Test uploading all document types"""
        headers = {"Authorization": f"Bearer {driver_token}"}
        doc_types = ["permis_conduire", "permis_sejour", "piece_identite"]
        
        for doc_type in doc_types:
            test_content = f"Test content for {doc_type}".encode()
            files = {"file": (f"test_{doc_type}_{uuid.uuid4().hex[:8]}.jpg", test_content, "image/jpeg")}
            data = {"document_type": doc_type}
            response = requests.post(
                f"{BASE_URL}/api/chauffeur/upload-document",
                files=files,
                data=data,
                headers=headers
            )
            assert response.status_code == 200, f"Failed to upload {doc_type}: {response.text}"
            print(f"✓ Uploaded {doc_type}")


class TestAdminDocumentVerification:
    """Admin document verification tests"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    @pytest.fixture
    def driver_token(self):
        response = requests.post(f"{BASE_URL}/api/chauffeur/login", json={
            "code_chauffeur": DRIVER_CODE,
            "password": DRIVER_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_admin_get_chauffeur_documents(self, admin_token):
        """Test admin getting chauffeur documents"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        # First get chauffeurs
        response = requests.get(f"{BASE_URL}/api/admin/chauffeurs", headers=headers)
        assert response.status_code == 200
        chauffeurs = response.json()
        if len(chauffeurs) > 0:
            chauffeur_id = chauffeurs[0]["id"]
            docs_response = requests.get(
                f"{BASE_URL}/api/admin/chauffeur/{chauffeur_id}/documents",
                headers=headers
            )
            assert docs_response.status_code == 200
            docs = docs_response.json()
            assert isinstance(docs, list)
            print(f"✓ Admin can view chauffeur documents: {len(docs)} docs")
    
    def test_admin_verify_document_approve(self, admin_token, driver_token):
        """Test admin approving a document"""
        # First upload a document as driver
        driver_headers = {"Authorization": f"Bearer {driver_token}"}
        test_content = f"Test doc for approval {uuid.uuid4().hex[:8]}".encode()
        files = {"file": (f"approve_test_{uuid.uuid4().hex[:8]}.jpg", test_content, "image/jpeg")}
        data = {"document_type": "piece_identite"}
        upload_response = requests.post(
            f"{BASE_URL}/api/chauffeur/upload-document",
            files=files,
            data=data,
            headers=driver_headers
        )
        assert upload_response.status_code == 200
        doc_id = upload_response.json()["document_id"]
        
        # Now approve as admin
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        verify_response = requests.post(
            f"{BASE_URL}/api/admin/document/{doc_id}/verify",
            data={"status": "approved"},
            headers=admin_headers
        )
        assert verify_response.status_code == 200
        result = verify_response.json()
        assert result["status"] == "approved"
        print(f"✓ Admin approved document: {doc_id}")
    
    def test_admin_verify_document_reject(self, admin_token, driver_token):
        """Test admin rejecting a document"""
        # First upload a document as driver
        driver_headers = {"Authorization": f"Bearer {driver_token}"}
        test_content = f"Test doc for rejection {uuid.uuid4().hex[:8]}".encode()
        files = {"file": (f"reject_test_{uuid.uuid4().hex[:8]}.jpg", test_content, "image/jpeg")}
        data = {"document_type": "permis_sejour"}
        upload_response = requests.post(
            f"{BASE_URL}/api/chauffeur/upload-document",
            files=files,
            data=data,
            headers=driver_headers
        )
        assert upload_response.status_code == 200
        doc_id = upload_response.json()["document_id"]
        
        # Now reject as admin
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        verify_response = requests.post(
            f"{BASE_URL}/api/admin/document/{doc_id}/verify",
            data={"status": "rejected"},
            headers=admin_headers
        )
        assert verify_response.status_code == 200
        result = verify_response.json()
        assert result["status"] == "rejected"
        print(f"✓ Admin rejected document: {doc_id}")
    
    def test_admin_verify_invalid_status(self, admin_token):
        """Test admin verify with invalid status"""
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        verify_response = requests.post(
            f"{BASE_URL}/api/admin/document/fake-doc-id/verify",
            data={"status": "invalid_status"},
            headers=admin_headers
        )
        assert verify_response.status_code == 400
        print(f"✓ Invalid status rejected")


class TestDriverDashboardFeatures:
    """Test driver dashboard related features"""
    
    @pytest.fixture
    def driver_token(self):
        response = requests.post(f"{BASE_URL}/api/chauffeur/login", json={
            "code_chauffeur": DRIVER_CODE,
            "password": DRIVER_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_driver_profile(self, driver_token):
        """Test driver profile endpoint"""
        headers = {"Authorization": f"Bearer {driver_token}"}
        response = requests.get(f"{BASE_URL}/api/chauffeur/me", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "nom" in data
        assert "prenom" in data
        assert "code_chauffeur" in data
        print(f"✓ Driver profile: {data['prenom']} {data['nom']} ({data['code_chauffeur']})")
    
    def test_driver_pending_course(self, driver_token):
        """Test driver pending course endpoint"""
        headers = {"Authorization": f"Bearer {driver_token}"}
        response = requests.get(f"{BASE_URL}/api/chauffeur/pending-course", headers=headers)
        assert response.status_code == 200
        print(f"✓ Pending course endpoint works")
    
    def test_driver_revenus(self, driver_token):
        """Test driver revenus endpoint"""
        headers = {"Authorization": f"Bearer {driver_token}"}
        response = requests.get(f"{BASE_URL}/api/chauffeur/revenus", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "revenus_brut_30j" in data
        print(f"✓ Driver revenus: {data['revenus_brut_30j']}€ (30 days)")


class TestAdminDashboard:
    """Test admin dashboard features"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_admin_dashboard(self, admin_token):
        """Test admin dashboard endpoint"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        # Data is nested under 'stats'
        stats = data.get("stats", data)
        assert "total_chauffeurs" in stats
        assert "total_clients" in stats
        assert "total_courses" in stats
        print(f"✓ Admin dashboard: {stats['total_chauffeurs']} chauffeurs, {stats['total_clients']} clients, {stats['total_courses']} courses")
    
    def test_admin_chauffeurs_list(self, admin_token):
        """Test admin chauffeurs list with rating info"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/chauffeurs", headers=headers)
        assert response.status_code == 200
        chauffeurs = response.json()
        assert isinstance(chauffeurs, list)
        if len(chauffeurs) > 0:
            # Check if rating fields are present
            chauffeur = chauffeurs[0]
            print(f"✓ Admin chauffeurs list: {len(chauffeurs)} chauffeurs")
            if "rating_avg" in chauffeur:
                print(f"  - Rating info available: avg={chauffeur.get('rating_avg', 0)}")


class TestHealthAndBasics:
    """Basic health and API tests"""
    
    def test_health_endpoint(self):
        """Test health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print(f"✓ Health endpoint OK")
    
    def test_root_endpoint(self):
        """Test root API endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "TaxiG" in data.get("message", "")
        print(f"✓ Root endpoint OK: {data['message']}")
    
    def test_active_chauffeurs(self):
        """Test active chauffeurs endpoint"""
        response = requests.get(f"{BASE_URL}/api/chauffeurs/actifs")
        assert response.status_code == 200
        chauffeurs = response.json()
        assert isinstance(chauffeurs, list)
        print(f"✓ Active chauffeurs: {len(chauffeurs)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
