from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, UploadFile, File, Form, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
from bson import ObjectId
import random
import math
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get('JWT_SECRET', 'taxig_super_secret_jwt_key_2024')
JWT_ALGORITHM = "HS256"

# Stripe setup
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY')
STRIPE_PUBLIC_KEY = os.environ.get('STRIPE_PUBLIC_KEY')

# Create the main app
app = FastAPI(title="TaxiG API")
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ========== TARIFICATION ==========
BASE_FARE = 6.30  # Prix de base en €
PRICE_PER_KM = 3.20  # Prix par km
TRAFFIC_WAIT_PER_MIN = 0.50  # Attente feux par minute
CLIENT_WAIT_PER_MIN = 0.70  # Attente client par minute
COMMISSION_RATE = 0.15  # 15% commission

# ========== MODELS ==========

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

# Client Models
class ClientRegister(BaseModel):
    nom: str
    prenom: str
    email: EmailStr
    password: str
    mode_paiement: str = "cash"  # cash, card

class ClientLogin(BaseModel):
    email: EmailStr
    password: str

class ClientResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    nom: str
    prenom: str
    email: str
    mode_paiement: str
    created_at: str

# Chauffeur Models
class ChauffeurRegister(BaseModel):
    nom: str
    prenom: str
    code_chauffeur: str
    email: EmailStr
    password: str
    permis_conduire: Optional[str] = None
    permis_sejour: Optional[str] = None

class ChauffeurLogin(BaseModel):
    code_chauffeur: str
    password: str

class ChauffeurResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    nom: str
    prenom: str
    code_chauffeur: str
    email: str
    actif_depuis: str
    nombre_courses: int
    is_online: bool
    position: Optional[Dict] = None

class ChauffeurPosition(BaseModel):
    latitude: float
    longitude: float

# Admin Models
class AdminLogin(BaseModel):
    username: str
    password: str

class AdminRegister(BaseModel):
    username: str
    password: str

# Course Models
class CourseRequest(BaseModel):
    pickup_lat: float
    pickup_lng: float
    pickup_address: str
    destination_lat: float
    destination_lng: float
    destination_address: str
    distance_km: float
    duration_minutes: float
    payment_method: str = "cash"  # cash or card

class CourseEstimate(BaseModel):
    base_fare: float
    distance_fare: float
    estimated_total: float
    distance_km: float
    duration_minutes: float

class CourseResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    commande_no: str
    client_id: str
    client_nom: str
    chauffeur_id: Optional[str]
    chauffeur_nom: Optional[str]
    pickup_address: str
    destination_address: str
    pickup_lat: float
    pickup_lng: float
    destination_lat: float
    destination_lng: float
    distance_km: float
    duration_minutes: float
    prix_estime: float
    prix_final: Optional[float]
    payment_method: str
    payment_status: str
    status: str  # pending, assigned, in_progress, completed, cancelled
    created_at: str
    completed_at: Optional[str]

# Roulette Models
class RouletteResult(BaseModel):
    won: bool
    prize: Optional[str]
    code_promo: Optional[str]
    discount_percent: Optional[int]

# Pointage Models
class PointageResponse(BaseModel):
    id: str
    chauffeur_id: str
    chauffeur_nom: str
    action: str
    timestamp: str

# ========== HELPERS ==========

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(data: dict, expires_delta: timedelta = timedelta(days=7)) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expiré")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalide")

async def get_current_user(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Non authentifié")
    token = auth_header.split(" ")[1]
    return decode_token(token)

def generate_commande_no() -> str:
    return f"TG-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

def calculate_fare(distance_km: float, duration_minutes: float = 0, wait_minutes: float = 0) -> dict:
    base = BASE_FARE
    distance_fare = distance_km * PRICE_PER_KM
    traffic_wait = (duration_minutes * 0.1) * TRAFFIC_WAIT_PER_MIN  # Estimate 10% of trip is waiting at lights
    client_wait = wait_minutes * CLIENT_WAIT_PER_MIN
    total = base + distance_fare + traffic_wait + client_wait
    return {
        "base_fare": round(base, 2),
        "distance_fare": round(distance_fare, 2),
        "traffic_wait_fare": round(traffic_wait, 2),
        "client_wait_fare": round(client_wait, 2),
        "total": round(total, 2)
    }

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371  # Radius of Earth in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    return round(R * c, 2)

# ========== CLIENT ROUTES ==========

@api_router.post("/client/register", response_model=dict)
async def register_client(client_data: ClientRegister):
    existing = await db.clients.find_one({"email": client_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    
    client_id = str(uuid.uuid4())
    client_doc = {
        "id": client_id,
        "nom": client_data.nom,
        "prenom": client_data.prenom,
        "email": client_data.email,
        "password": hash_password(client_data.password),
        "mode_paiement": client_data.mode_paiement,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "promo_codes": [],
        "last_roulette": None
    }
    await db.clients.insert_one(client_doc)
    
    token = create_token({"sub": client_id, "type": "client", "email": client_data.email})
    return {"access_token": token, "token_type": "bearer", "user": {
        "id": client_id,
        "nom": client_data.nom,
        "prenom": client_data.prenom,
        "email": client_data.email
    }}

@api_router.post("/client/login", response_model=dict)
async def login_client(login_data: ClientLogin):
    client = await db.clients.find_one({"email": login_data.email}, {"_id": 0})
    if not client or not verify_password(login_data.password, client["password"]):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    
    token = create_token({"sub": client["id"], "type": "client", "email": client["email"]})
    return {"access_token": token, "token_type": "bearer", "user": {
        "id": client["id"],
        "nom": client["nom"],
        "prenom": client["prenom"],
        "email": client["email"]
    }}

@api_router.get("/client/me")
async def get_client_profile(user=Depends(get_current_user)):
    if user.get("type") != "client":
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    client = await db.clients.find_one({"id": user["sub"]}, {"_id": 0, "password": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    return client

@api_router.get("/client/courses")
async def get_client_courses(user=Depends(get_current_user)):
    if user.get("type") != "client":
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    courses = await db.client_commandes.find({"client_id": user["sub"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return courses

@api_router.get("/client/stats")
async def get_client_stats(user=Depends(get_current_user)):
    if user.get("type") != "client":
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    courses = await db.client_commandes.find({"client_id": user["sub"], "status": "completed"}, {"_id": 0}).to_list(1000)
    
    total_courses = len(courses)
    total_spent = sum(c.get("prix_final", 0) or c.get("prix_estime", 0) for c in courses)
    total_km = sum(c.get("distance_km", 0) for c in courses)
    
    # Simulated savings (TaxiG is 15% cheaper than competitors)
    savings_vs_uber = round(total_spent * 0.15, 2)
    savings_vs_taxiphone = round(total_spent * 0.20, 2)
    
    return {
        "total_courses": total_courses,
        "total_spent": round(total_spent, 2),
        "total_km": round(total_km, 2),
        "savings_vs_uber": savings_vs_uber,
        "savings_vs_taxiphone": savings_vs_taxiphone,
        "average_per_course": round(total_spent / total_courses, 2) if total_courses > 0 else 0
    }

# ========== ROULETTE PROMO ==========

@api_router.post("/client/roulette", response_model=RouletteResult)
async def spin_roulette(user=Depends(get_current_user)):
    if user.get("type") != "client":
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    client = await db.clients.find_one({"id": user["sub"]}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    today = datetime.now(timezone.utc).date().isoformat()
    last_spin = client.get("last_roulette")
    
    if last_spin and last_spin[:10] == today:
        raise HTTPException(status_code=400, detail="Vous avez déjà joué aujourd'hui ! Revenez demain.")
    
    # 1 chance sur 20 de gagner
    won = random.randint(1, 20) == 1
    result = RouletteResult(won=won, prize=None, code_promo=None, discount_percent=None)
    
    if won:
        discount = random.choice([5, 10, 15, 20])
        code = f"TAXIG{discount}-{uuid.uuid4().hex[:6].upper()}"
        result.prize = f"Réduction de {discount}%"
        result.code_promo = code
        result.discount_percent = discount
        
        await db.clients.update_one(
            {"id": user["sub"]},
            {"$push": {"promo_codes": {"code": code, "discount": discount, "used": False, "created_at": datetime.now(timezone.utc).isoformat()}}}
        )
    
    await db.clients.update_one(
        {"id": user["sub"]},
        {"$set": {"last_roulette": datetime.now(timezone.utc).isoformat()}}
    )
    
    return result

# ========== CHAUFFEUR ROUTES ==========

@api_router.post("/chauffeur/register", response_model=dict)
async def register_chauffeur(chauffeur_data: ChauffeurRegister):
    existing = await db.chauffeurs.find_one({"$or": [{"email": chauffeur_data.email}, {"code_chauffeur": chauffeur_data.code_chauffeur}]})
    if existing:
        raise HTTPException(status_code=400, detail="Email ou code chauffeur déjà utilisé")
    
    chauffeur_id = str(uuid.uuid4())
    chauffeur_doc = {
        "id": chauffeur_id,
        "nom": chauffeur_data.nom,
        "prenom": chauffeur_data.prenom,
        "code_chauffeur": chauffeur_data.code_chauffeur,
        "email": chauffeur_data.email,
        "password": hash_password(chauffeur_data.password),
        "permis_conduire": chauffeur_data.permis_conduire,
        "permis_sejour": chauffeur_data.permis_sejour,
        "actif_depuis": datetime.now(timezone.utc).isoformat(),
        "nombre_courses": 0,
        "is_online": False,
        "position": None,
        "indisponibilites": []
    }
    await db.chauffeurs.insert_one(chauffeur_doc)
    
    # Create revenus entry
    await db.chauffeur_revenus.insert_one({
        "chauffeur_id": chauffeur_id,
        "revenus_brut_30j": 0,
        "revenus_net_30j": 0,
        "commission_due": 0,
        "updated_at": datetime.now(timezone.utc).isoformat()
    })
    
    token = create_token({"sub": chauffeur_id, "type": "chauffeur", "code": chauffeur_data.code_chauffeur})
    return {"access_token": token, "token_type": "bearer", "user": {
        "id": chauffeur_id,
        "nom": chauffeur_data.nom,
        "prenom": chauffeur_data.prenom,
        "code_chauffeur": chauffeur_data.code_chauffeur
    }}

@api_router.post("/chauffeur/login", response_model=dict)
async def login_chauffeur(login_data: ChauffeurLogin):
    chauffeur = await db.chauffeurs.find_one({"code_chauffeur": login_data.code_chauffeur}, {"_id": 0})
    
    # Debug log
    import logging
    logging.info(f"Login attempt for {login_data.code_chauffeur}: found={chauffeur is not None}")
    if chauffeur:
        logging.info(f"  -> id={chauffeur.get('id')}, nom={chauffeur.get('prenom')} {chauffeur.get('nom')}")
    
    if not chauffeur:
        raise HTTPException(status_code=401, detail="Code ou mot de passe incorrect")
    
    # Check password (support both 'password' and 'hashed_password' fields)
    stored_password = chauffeur.get("password") or chauffeur.get("hashed_password")
    if not stored_password or not verify_password(login_data.password, stored_password):
        raise HTTPException(status_code=401, detail="Code ou mot de passe incorrect")
    
    chauffeur_id = chauffeur.get("id") or chauffeur.get("code_chauffeur")
    token = create_token({"sub": chauffeur_id, "type": "chauffeur", "code": chauffeur["code_chauffeur"]})
    return {"access_token": token, "token_type": "bearer", "user": {
        "id": chauffeur_id,
        "nom": chauffeur.get("nom", ""),
        "prenom": chauffeur.get("prenom", ""),
        "code_chauffeur": chauffeur["code_chauffeur"]
    }}

@api_router.post("/chauffeur/pointer")
async def pointer_chauffeur(user=Depends(get_current_user)):
    if user.get("type") != "chauffeur":
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    # Support both id and code_chauffeur
    chauffeur = await db.chauffeurs.find_one(
        {"$or": [{"id": user["sub"]}, {"code_chauffeur": user.get("code")}]}, 
        {"_id": 0}
    )
    if not chauffeur:
        raise HTTPException(status_code=404, detail="Chauffeur non trouvé")
    
    chauffeur_id = chauffeur.get("id") or chauffeur.get("code_chauffeur")
    new_status = not chauffeur.get("is_online", False)
    action = "start" if new_status else "end"
    
    await db.chauffeurs.update_one(
        {"$or": [{"id": chauffeur_id}, {"code_chauffeur": user.get("code")}]},
        {"$set": {"is_online": new_status, "status": "online" if new_status else "offline"}}
    )
    
    # Log pointage
    pointage_doc = {
        "id": str(uuid.uuid4()),
        "chauffeur_id": chauffeur_id,
        "chauffeur_nom": f"{chauffeur.get('prenom', '')} {chauffeur.get('nom', '')}",
        "action": action,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.pointages.insert_one(pointage_doc)
    
    # Calculate daily revenue if ending shift
    daily_revenue = None
    if action == "end":
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        courses_today = await db.chauffeur_commandes.find({
            "chauffeur_id": chauffeur_id,
            "status": "completed",
            "completed_at": {"$gte": today_start.isoformat()}
        }, {"_id": 0}).to_list(100)
        
        daily_revenue = sum(c.get("prix", 0) for c in courses_today)
    
    return {
        "status": "online" if new_status else "offline",
        "action": action,
        "timestamp": pointage_doc["timestamp"],
        "daily_revenue": daily_revenue
    }

@api_router.post("/chauffeur/position")
async def update_chauffeur_position(position: ChauffeurPosition, user=Depends(get_current_user)):
    if user.get("type") != "chauffeur":
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    # Support both id and code_chauffeur
    await db.chauffeurs.update_one(
        {"$or": [{"id": user["sub"]}, {"code_chauffeur": user.get("code")}]},
        {"$set": {"position": {"lat": position.latitude, "lng": position.longitude, "updated_at": datetime.now(timezone.utc).isoformat()}}}
    )
    return {"status": "updated"}

@api_router.get("/chauffeur/me")
async def get_chauffeur_profile(user=Depends(get_current_user)):
    if user.get("type") != "chauffeur":
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    # Support both id formats
    chauffeur = await db.chauffeurs.find_one(
        {"$or": [{"id": user["sub"]}, {"code_chauffeur": user.get("code")}]}, 
        {"_id": 0, "password": 0, "hashed_password": 0}
    )
    if not chauffeur:
        raise HTTPException(status_code=404, detail="Chauffeur non trouvé")
    return chauffeur

@api_router.get("/chauffeur/commandes")
async def get_chauffeur_commandes(status: Optional[str] = None, user=Depends(get_current_user)):
    if user.get("type") != "chauffeur":
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    query = {"chauffeur_id": user["sub"]}
    if status:
        query["status"] = status
    
    commandes = await db.chauffeur_commandes.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return commandes

@api_router.get("/chauffeur/revenus")
async def get_chauffeur_revenus(user=Depends(get_current_user)):
    if user.get("type") != "chauffeur":
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    # Calculate 30-day revenues
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    
    commandes = await db.chauffeur_commandes.find({
        "chauffeur_id": user["sub"],
        "status": "completed",
        "completed_at": {"$gte": thirty_days_ago}
    }, {"_id": 0}).to_list(1000)
    
    revenus_brut = sum(c.get("prix", 0) for c in commandes)
    commission = revenus_brut * COMMISSION_RATE
    revenus_net = revenus_brut - commission
    
    # Update in DB
    await db.chauffeur_revenus.update_one(
        {"chauffeur_id": user["sub"]},
        {"$set": {
            "revenus_brut_30j": round(revenus_brut, 2),
            "revenus_net_30j": round(revenus_net, 2),
            "commission_due": round(commission, 2),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    return {
        "revenus_brut_30j": round(revenus_brut, 2),
        "revenus_net_30j": round(revenus_net, 2),
        "commission_due": round(commission, 2),
        "nombre_courses_30j": len(commandes)
    }

@api_router.get("/chauffeur/pending-course")
async def get_pending_course(user=Depends(get_current_user)):
    if user.get("type") != "chauffeur":
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    # Check if chauffeur is online - support both id and code
    chauffeur = await db.chauffeurs.find_one(
        {"$or": [{"id": user["sub"]}, {"code_chauffeur": user.get("code")}]}, 
        {"_id": 0}
    )
    if not chauffeur or not chauffeur.get("is_online"):
        return {"course": None}
    
    chauffeur_id = chauffeur.get("id") or chauffeur.get("code_chauffeur")
    
    # Check for assigned course
    course = await db.client_commandes.find_one({
        "chauffeur_id": chauffeur_id,
        "status": {"$in": ["assigned", "in_progress"]}
    }, {"_id": 0})
    
    if course:
        return {"course": course, "type": "assigned"}
    
    # Check for pending course request
    pending = await db.course_requests.find_one({
        "target_chauffeur_id": chauffeur_id,
        "status": "pending"
    }, {"_id": 0})
    
    if pending:
        return {"course": pending, "type": "request"}
    
    return {"course": None}

@api_router.post("/chauffeur/respond-course/{request_id}")
async def respond_to_course(request_id: str, accept: bool, user=Depends(get_current_user)):
    if user.get("type") != "chauffeur":
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    request_doc = await db.course_requests.find_one({"id": request_id}, {"_id": 0})
    if not request_doc:
        raise HTTPException(status_code=404, detail="Demande non trouvée")
    
    chauffeur = await db.chauffeurs.find_one(
        {"$or": [{"id": user["sub"]}, {"code_chauffeur": user.get("code")}]}, 
        {"_id": 0}
    )
    chauffeur_id = chauffeur.get("id") or chauffeur.get("code_chauffeur")
    
    if accept:
        # Accept the course
        await db.course_requests.update_one(
            {"id": request_id},
            {"$set": {"status": "accepted"}}
        )
        
        # Update main course
        await db.client_commandes.update_one(
            {"id": request_doc["course_id"]},
            {"$set": {
                "chauffeur_id": chauffeur_id,
                "chauffeur_nom": f"{chauffeur.get('prenom', '')} {chauffeur.get('nom', '')}",
                "status": "assigned"
            }}
        )
        
        # Create chauffeur commande entry
        await db.chauffeur_commandes.insert_one({
            "id": str(uuid.uuid4()),
            "chauffeur_id": chauffeur_id,
            "commande_no": request_doc["commande_no"],
            "course_id": request_doc["course_id"],
            "client_nom": request_doc["client_nom"],
            "status": "assigned",
            "prix": request_doc["prix_estime"],
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        return {"status": "accepted", "course_id": request_doc["course_id"]}
    else:
        # Reject - find next closest driver
        await db.course_requests.update_one(
            {"id": request_id},
            {"$set": {"status": "rejected", "rejected_by": chauffeur_id}}
        )
        
        # Get rejected chauffeurs for this course
        rejected = await db.course_requests.find({
            "course_id": request_doc["course_id"],
            "status": "rejected"
        }, {"_id": 0}).to_list(100)
        rejected_ids = [r.get("target_chauffeur_id") for r in rejected]
        rejected_ids.append(chauffeur_id)
        
        # Find next available chauffeur
        course = await db.client_commandes.find_one({"id": request_doc["course_id"]}, {"_id": 0})
        if course:
            next_chauffeur = await find_closest_chauffeur(
                course["pickup_lat"],
                course["pickup_lng"],
                excluded_ids=rejected_ids
            )
            
            if next_chauffeur:
                # Create new request for next chauffeur
                new_request = {
                    "id": str(uuid.uuid4()),
                    "course_id": request_doc["course_id"],
                    "commande_no": request_doc["commande_no"],
                    "target_chauffeur_id": next_chauffeur["id"],
                    "client_id": request_doc["client_id"],
                    "client_nom": request_doc["client_nom"],
                    "pickup_address": request_doc["pickup_address"],
                    "destination_address": request_doc["destination_address"],
                    "pickup_lat": request_doc["pickup_lat"],
                    "pickup_lng": request_doc["pickup_lng"],
                    "prix_estime": request_doc["prix_estime"],
                    "status": "pending",
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                await db.course_requests.insert_one(new_request)
        
        return {"status": "rejected"}

@api_router.post("/chauffeur/complete-course/{course_id}")
async def complete_course(course_id: str, wait_minutes: float = 0, user=Depends(get_current_user)):
    if user.get("type") != "chauffeur":
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    course = await db.client_commandes.find_one({"id": course_id, "chauffeur_id": user["sub"]}, {"_id": 0})
    if not course:
        raise HTTPException(status_code=404, detail="Course non trouvée")
    
    # Calculate final price with waiting time
    fare = calculate_fare(course["distance_km"], course["duration_minutes"], wait_minutes)
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Update course
    await db.client_commandes.update_one(
        {"id": course_id},
        {"$set": {
            "status": "completed",
            "prix_final": fare["total"],
            "wait_minutes": wait_minutes,
            "completed_at": now
        }}
    )
    
    # Update chauffeur commande
    await db.chauffeur_commandes.update_one(
        {"course_id": course_id},
        {"$set": {
            "status": "completed",
            "prix": fare["total"],
            "completed_at": now
        }}
    )
    
    # Update chauffeur stats
    await db.chauffeurs.update_one(
        {"id": user["sub"]},
        {"$inc": {"nombre_courses": 1}}
    )
    
    return {"status": "completed", "prix_final": fare["total"], "fare_details": fare}

@api_router.post("/chauffeur/start-course/{course_id}")
async def start_course(course_id: str, user=Depends(get_current_user)):
    if user.get("type") != "chauffeur":
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    course = await db.client_commandes.find_one({"id": course_id, "chauffeur_id": user["sub"]}, {"_id": 0})
    if not course:
        raise HTTPException(status_code=404, detail="Course non trouvée")
    
    await db.client_commandes.update_one(
        {"id": course_id},
        {"$set": {"status": "in_progress", "started_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    await db.chauffeur_commandes.update_one(
        {"course_id": course_id},
        {"$set": {"status": "in_progress"}}
    )
    
    return {"status": "in_progress"}

@api_router.post("/chauffeur/indisponibilite")
async def add_indisponibilite(date: str, user=Depends(get_current_user)):
    if user.get("type") != "chauffeur":
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    await db.chauffeurs.update_one(
        {"id": user["sub"]},
        {"$addToSet": {"indisponibilites": date}}
    )
    return {"status": "added", "date": date}

@api_router.delete("/chauffeur/indisponibilite/{date}")
async def remove_indisponibilite(date: str, user=Depends(get_current_user)):
    if user.get("type") != "chauffeur":
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    await db.chauffeurs.update_one(
        {"id": user["sub"]},
        {"$pull": {"indisponibilites": date}}
    )
    return {"status": "removed", "date": date}

# ========== COURSE BOOKING ==========

async def find_closest_chauffeur(lat: float, lng: float, excluded_ids: List[str] = None):
    query = {
        "$or": [{"is_online": True}, {"status": "online"}],
        "position": {"$ne": None}
    }
    if excluded_ids:
        query["id"] = {"$nin": excluded_ids}
    
    chauffeurs = await db.chauffeurs.find(query, {"_id": 0}).to_list(100)
    
    if not chauffeurs:
        return None
    
    # Calculate distances
    for c in chauffeurs:
        pos = c.get("position", {})
        if pos and pos.get("lat") and pos.get("lng"):
            c["distance"] = calculate_distance(lat, lng, pos["lat"], pos["lng"])
        else:
            c["distance"] = float('inf')
    
    # Sort by distance
    chauffeurs.sort(key=lambda x: x["distance"])
    
    # Return first chauffeur with valid id
    for ch in chauffeurs:
        ch_id = ch.get("id") or ch.get("code_chauffeur")
        if ch_id:
            ch["id"] = ch_id  # Ensure id field exists
            return ch
    
    return None

@api_router.post("/course/estimate", response_model=CourseEstimate)
async def estimate_course(request: CourseRequest, user=Depends(get_current_user)):
    fare = calculate_fare(request.distance_km, request.duration_minutes)
    return CourseEstimate(
        base_fare=fare["base_fare"],
        distance_fare=fare["distance_fare"],
        estimated_total=fare["total"],
        distance_km=request.distance_km,
        duration_minutes=request.duration_minutes
    )

@api_router.post("/course/book")
async def book_course(request: CourseRequest, user=Depends(get_current_user)):
    if user.get("type") != "client":
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    client = await db.clients.find_one({"id": user["sub"]}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    # Calculate fare
    fare = calculate_fare(request.distance_km, request.duration_minutes)
    
    # Create course
    course_id = str(uuid.uuid4())
    commande_no = generate_commande_no()
    
    course_doc = {
        "id": course_id,
        "commande_no": commande_no,
        "client_id": user["sub"],
        "client_nom": f"{client['prenom']} {client['nom']}",
        "chauffeur_id": None,
        "chauffeur_nom": None,
        "pickup_address": request.pickup_address,
        "destination_address": request.destination_address,
        "pickup_lat": request.pickup_lat,
        "pickup_lng": request.pickup_lng,
        "destination_lat": request.destination_lat,
        "destination_lng": request.destination_lng,
        "distance_km": request.distance_km,
        "duration_minutes": request.duration_minutes,
        "prix_estime": fare["total"],
        "prix_final": None,
        "payment_method": request.payment_method,
        "payment_status": "pending",
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None
    }
    
    await db.client_commandes.insert_one(course_doc)
    
    # Find closest available chauffeur
    closest = await find_closest_chauffeur(request.pickup_lat, request.pickup_lng)
    
    if closest:
        # Create course request for chauffeur
        course_request = {
            "id": str(uuid.uuid4()),
            "course_id": course_id,
            "commande_no": commande_no,
            "target_chauffeur_id": closest["id"],
            "client_id": user["sub"],
            "client_nom": f"{client['prenom']} {client['nom']}",
            "pickup_address": request.pickup_address,
            "destination_address": request.destination_address,
            "pickup_lat": request.pickup_lat,
            "pickup_lng": request.pickup_lng,
            "prix_estime": fare["total"],
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.course_requests.insert_one(course_request)
    
    return {
        "course_id": course_id,
        "commande_no": commande_no,
        "prix_estime": fare["total"],
        "chauffeur_found": closest is not None,
        "chauffeur_distance": closest.get("distance") if closest else None,
        "status": "pending"
    }

@api_router.get("/course/{course_id}")
async def get_course(course_id: str, user=Depends(get_current_user)):
    course = await db.client_commandes.find_one({"id": course_id}, {"_id": 0})
    if not course:
        raise HTTPException(status_code=404, detail="Course non trouvée")
    
    # Get chauffeur position if assigned
    chauffeur_position = None
    if course.get("chauffeur_id"):
        chauffeur = await db.chauffeurs.find_one({"id": course["chauffeur_id"]}, {"_id": 0})
        if chauffeur and chauffeur.get("position"):
            chauffeur_position = chauffeur["position"]
    
    return {**course, "chauffeur_position": chauffeur_position}

@api_router.post("/course/{course_id}/cancel")
async def cancel_course(course_id: str, user=Depends(get_current_user)):
    course = await db.client_commandes.find_one({"id": course_id}, {"_id": 0})
    if not course:
        raise HTTPException(status_code=404, detail="Course non trouvée")
    
    if course["status"] not in ["pending", "assigned"]:
        raise HTTPException(status_code=400, detail="Course ne peut pas être annulée")
    
    await db.client_commandes.update_one(
        {"id": course_id},
        {"$set": {"status": "cancelled"}}
    )
    
    # Cancel any pending requests
    await db.course_requests.update_many(
        {"course_id": course_id},
        {"$set": {"status": "cancelled"}}
    )
    
    return {"status": "cancelled"}

# ========== PUBLIC ROUTES ==========

@api_router.get("/chauffeurs/actifs")
async def get_active_chauffeurs():
    chauffeurs = await db.chauffeurs.find(
        {"$or": [{"is_online": True}, {"status": "online"}], "position": {"$ne": None}},
        {"_id": 0, "password": 0, "hashed_password": 0, "permis_conduire": 0, "permis_sejour": 0}
    ).to_list(100)
    
    print(f"[DEBUG] Found {len(chauffeurs)} chauffeurs from DB")
    
    # Normalize position format for frontend
    result = []
    for c in chauffeurs:
        driver = {
            "id": c.get("id") or c.get("code_chauffeur"),
            "nom": c.get("nom", ""),
            "prenom": c.get("prenom", ""),
            "vehicule": c.get("vehicule", {}),
        }
        
        # Handle GeoJSON format
        pos = c.get("position")
        if pos and isinstance(pos, dict):
            if "coordinates" in pos and len(pos["coordinates"]) >= 2:
                # GeoJSON format [lng, lat] -> {lat, lng}
                driver["position"] = {
                    "lat": pos["coordinates"][1],
                    "lng": pos["coordinates"][0]
                }
            elif "lat" in pos and "lng" in pos:
                driver["position"] = {"lat": pos["lat"], "lng": pos["lng"]}
        
        if driver.get("position"):
            result.append(driver)
    
    print(f"[DEBUG] Returning {len(result)} chauffeurs")
    return result

# ========== ADMIN ROUTES ==========

@api_router.post("/admin/login")
async def admin_login(login_data: AdminLogin):
    admin = await db.admins.find_one({"username": login_data.username}, {"_id": 0})
    if not admin or not verify_password(login_data.password, admin["password"]):
        raise HTTPException(status_code=401, detail="Identifiants incorrects")
    
    token = create_token({"sub": admin["id"], "type": "admin", "username": admin["username"]})
    return {"access_token": token, "token_type": "bearer", "user": {
        "id": admin["id"],
        "username": admin["username"]
    }}

@api_router.post("/admin/register")
async def admin_register(admin_data: AdminRegister):
    existing = await db.admins.find_one({"username": admin_data.username})
    if existing:
        raise HTTPException(status_code=400, detail="Username déjà utilisé")
    
    admin_id = str(uuid.uuid4())
    admin_doc = {
        "id": admin_id,
        "username": admin_data.username,
        "password": hash_password(admin_data.password),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.admins.insert_one(admin_doc)
    
    token = create_token({"sub": admin_id, "type": "admin", "username": admin_data.username})
    return {"access_token": token, "token_type": "bearer"}

@api_router.get("/admin/dashboard")
async def admin_dashboard(user=Depends(get_current_user)):
    if user.get("type") != "admin":
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    # Get counts
    total_chauffeurs = await db.chauffeurs.count_documents({})
    active_chauffeurs = await db.chauffeurs.count_documents({"is_online": True})
    total_clients = await db.clients.count_documents({})
    total_courses = await db.client_commandes.count_documents({})
    completed_courses = await db.client_commandes.count_documents({"status": "completed"})
    
    # Calculate total revenue
    courses = await db.client_commandes.find({"status": "completed"}, {"_id": 0}).to_list(10000)
    total_revenue = sum(c.get("prix_final", 0) or c.get("prix_estime", 0) for c in courses)
    commission_total = total_revenue * COMMISSION_RATE
    
    # Get recent pointages
    recent_pointages = await db.pointages.find({}, {"_id": 0}).sort("timestamp", -1).to_list(20)
    
    return {
        "stats": {
            "total_chauffeurs": total_chauffeurs,
            "active_chauffeurs": active_chauffeurs,
            "total_clients": total_clients,
            "total_courses": total_courses,
            "completed_courses": completed_courses,
            "total_revenue": round(total_revenue, 2),
            "commission_total": round(commission_total, 2)
        },
        "recent_pointages": recent_pointages
    }

@api_router.get("/admin/chauffeurs")
async def admin_get_chauffeurs(user=Depends(get_current_user)):
    if user.get("type") != "admin":
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    chauffeurs = await db.chauffeurs.find({}, {"_id": 0, "password": 0, "hashed_password": 0}).to_list(1000)
    
    # Get revenus for each - handle chauffeurs without id field
    for c in chauffeurs:
        chauffeur_id = c.get("id") or c.get("code_chauffeur")
        if chauffeur_id:
            revenus = await db.chauffeur_revenus.find_one({"chauffeur_id": chauffeur_id}, {"_id": 0})
            c["revenus"] = revenus
            c["id"] = chauffeur_id  # Ensure id field exists
        else:
            c["revenus"] = None
    
    return chauffeurs

@api_router.post("/admin/chauffeur")
async def admin_add_chauffeur(chauffeur_data: ChauffeurRegister, user=Depends(get_current_user)):
    if user.get("type") != "admin":
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    return await register_chauffeur(chauffeur_data)

@api_router.delete("/admin/chauffeur/{chauffeur_id}")
async def admin_delete_chauffeur(chauffeur_id: str, user=Depends(get_current_user)):
    if user.get("type") != "admin":
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    result = await db.chauffeurs.delete_one({"id": chauffeur_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Chauffeur non trouvé")
    
    await db.chauffeur_revenus.delete_one({"chauffeur_id": chauffeur_id})
    await db.chauffeur_commandes.delete_many({"chauffeur_id": chauffeur_id})
    
    return {"status": "deleted"}

@api_router.post("/admin/chauffeur/{chauffeur_id}/rapport")
async def admin_add_rapport(chauffeur_id: str, rapport: str = Form(...), user=Depends(get_current_user)):
    if user.get("type") != "admin":
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    rapport_doc = {
        "id": str(uuid.uuid4()),
        "chauffeur_id": chauffeur_id,
        "rapport": rapport,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user["sub"]
    }
    await db.chauffeur_rapports.insert_one(rapport_doc)
    
    return {"status": "added", "rapport_id": rapport_doc["id"]}

@api_router.get("/admin/clients")
async def admin_get_clients(user=Depends(get_current_user)):
    if user.get("type") != "admin":
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    clients = await db.clients.find({}, {"_id": 0, "password": 0}).to_list(1000)
    
    for c in clients:
        courses_count = await db.client_commandes.count_documents({"client_id": c["id"]})
        c["nombre_courses"] = courses_count
    
    return clients

@api_router.get("/admin/courses")
async def admin_get_courses(
    status: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    user=Depends(get_current_user)
):
    if user.get("type") != "admin":
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    query = {}
    if status:
        query["status"] = status
    if date_from:
        query["created_at"] = {"$gte": date_from}
    if date_to:
        if "created_at" in query:
            query["created_at"]["$lte"] = date_to
        else:
            query["created_at"] = {"$lte": date_to}
    
    courses = await db.client_commandes.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return courses

@api_router.get("/admin/revenus")
async def admin_get_revenus(
    period: str = "30d",
    user=Depends(get_current_user)
):
    if user.get("type") != "admin":
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    days = 30 if period == "30d" else 7 if period == "7d" else 365
    start_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    
    courses = await db.client_commandes.find({
        "status": "completed",
        "completed_at": {"$gte": start_date}
    }, {"_id": 0}).to_list(10000)
    
    total = sum(c.get("prix_final", 0) or c.get("prix_estime", 0) for c in courses)
    commission = total * COMMISSION_RATE
    
    # Group by day
    daily_revenue = {}
    for c in courses:
        date = c.get("completed_at", c.get("created_at"))[:10]
        if date not in daily_revenue:
            daily_revenue[date] = 0
        daily_revenue[date] += c.get("prix_final", 0) or c.get("prix_estime", 0)
    
    return {
        "period": period,
        "total_revenue": round(total, 2),
        "total_commission": round(commission, 2),
        "number_of_courses": len(courses),
        "daily_breakdown": daily_revenue
    }

# ========== STRIPE PAYMENT ==========

@api_router.get("/stripe/public-key")
async def get_stripe_public_key():
    return {"public_key": STRIPE_PUBLIC_KEY}

@api_router.post("/payment/create-session")
async def create_payment_session(course_id: str, origin_url: str, user=Depends(get_current_user)):
    if user.get("type") != "client":
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    course = await db.client_commandes.find_one({"id": course_id, "client_id": user["sub"]}, {"_id": 0})
    if not course:
        raise HTTPException(status_code=404, detail="Course non trouvée")
    
    try:
        from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest
        
        success_url = f"{origin_url}/client/course/{course_id}?session_id={{CHECKOUT_SESSION_ID}}&payment=success"
        cancel_url = f"{origin_url}/client/course/{course_id}?payment=cancelled"
        
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=f"{origin_url}/api/webhook/stripe")
        
        checkout_request = CheckoutSessionRequest(
            amount=float(course["prix_estime"]),
            currency="eur",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "course_id": course_id,
                "client_id": user["sub"],
                "commande_no": course["commande_no"]
            }
        )
        
        session = await stripe_checkout.create_checkout_session(checkout_request)
        
        # Save payment transaction
        await db.payment_transactions.insert_one({
            "id": str(uuid.uuid4()),
            "session_id": session.session_id,
            "course_id": course_id,
            "client_id": user["sub"],
            "amount": course["prix_estime"],
            "currency": "eur",
            "status": "initiated",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        return {"checkout_url": session.url, "session_id": session.session_id}
    
    except Exception as e:
        logger.error(f"Stripe error: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la création du paiement")

@api_router.get("/payment/status/{session_id}")
async def get_payment_status(session_id: str, user=Depends(get_current_user)):
    try:
        from emergentintegrations.payments.stripe.checkout import StripeCheckout
        
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY)
        status = await stripe_checkout.get_checkout_status(session_id)
        
        # Update transaction
        if status.payment_status == "paid":
            transaction = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
            if transaction and transaction.get("status") != "paid":
                await db.payment_transactions.update_one(
                    {"session_id": session_id},
                    {"$set": {"status": "paid", "paid_at": datetime.now(timezone.utc).isoformat()}}
                )
                
                # Update course payment status
                await db.client_commandes.update_one(
                    {"id": transaction["course_id"]},
                    {"$set": {"payment_status": "paid"}}
                )
        
        return {
            "status": status.status,
            "payment_status": status.payment_status,
            "amount": status.amount_total / 100,  # Convert from cents
            "currency": status.currency
        }
    except Exception as e:
        logger.error(f"Payment status error: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la vérification du paiement")

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    try:
        from emergentintegrations.payments.stripe.checkout import StripeCheckout
        
        body = await request.body()
        signature = request.headers.get("Stripe-Signature")
        
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY)
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        if webhook_response.payment_status == "paid":
            course_id = webhook_response.metadata.get("course_id")
            if course_id:
                await db.client_commandes.update_one(
                    {"id": course_id},
                    {"$set": {"payment_status": "paid"}}
                )
                await db.payment_transactions.update_one(
                    {"session_id": webhook_response.session_id},
                    {"$set": {"status": "paid", "paid_at": datetime.now(timezone.utc).isoformat()}}
                )
        
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"status": "error"}

# ========== RATINGS ==========

class RatingRequest(BaseModel):
    stars: int = Field(ge=1, le=5)
    comment: Optional[str] = None

@api_router.post("/course/{course_id}/rate")
async def rate_course(course_id: str, rating: RatingRequest, user=Depends(get_current_user)):
    course = await db.client_commandes.find_one({"id": course_id}, {"_id": 0})
    if not course:
        raise HTTPException(status_code=404, detail="Course non trouvée")
    if course["status"] != "completed":
        raise HTTPException(status_code=400, detail="La course doit être terminée pour noter")
    
    rater_type = user.get("type")
    rater_id = user["sub"]
    
    if rater_type == "client":
        if course["client_id"] != rater_id:
            raise HTTPException(status_code=403, detail="Pas votre course")
        rated_id = course.get("chauffeur_id")
        rated_type = "chauffeur"
    elif rater_type == "chauffeur":
        rated_id = course.get("client_id")
        rated_type = "client"
    else:
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    if not rated_id:
        raise HTTPException(status_code=400, detail="Aucun destinataire pour la note")
    
    existing = await db.ratings.find_one({
        "course_id": course_id, "rater_id": rater_id
    })
    if existing:
        raise HTTPException(status_code=400, detail="Vous avez déjà noté cette course")
    
    rating_doc = {
        "id": str(uuid.uuid4()),
        "course_id": course_id,
        "rater_id": rater_id,
        "rater_type": rater_type,
        "rated_id": rated_id,
        "rated_type": rated_type,
        "stars": rating.stars,
        "comment": rating.comment,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.ratings.insert_one(rating_doc)
    
    # Update average rating on the rated entity
    all_ratings = await db.ratings.find({"rated_id": rated_id}, {"_id": 0}).to_list(10000)
    avg = sum(r["stars"] for r in all_ratings) / len(all_ratings) if all_ratings else 0
    count = len(all_ratings)
    
    collection = "chauffeurs" if rated_type == "chauffeur" else "clients"
    await db[collection].update_one(
        {"id": rated_id},
        {"$set": {"rating_avg": round(avg, 1), "rating_count": count}}
    )
    
    return {"status": "rated", "average": round(avg, 1), "count": count}

@api_router.get("/course/{course_id}/rating")
async def get_course_rating(course_id: str, user=Depends(get_current_user)):
    rater_id = user["sub"]
    rating = await db.ratings.find_one({"course_id": course_id, "rater_id": rater_id}, {"_id": 0})
    return {"rating": rating}

@api_router.get("/chauffeur/{chauffeur_id}/rating")
async def get_chauffeur_rating(chauffeur_id: str):
    ratings = await db.ratings.find({"rated_id": chauffeur_id, "rated_type": "chauffeur"}, {"_id": 0}).to_list(100)
    if not ratings:
        return {"average": 0, "count": 0, "ratings": []}
    avg = sum(r["stars"] for r in ratings) / len(ratings)
    return {"average": round(avg, 1), "count": len(ratings), "ratings": ratings}

# ========== DOCUMENT UPLOAD ==========

UPLOAD_DIR = Path(__file__).parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

@api_router.post("/chauffeur/upload-document")
async def upload_document(
    document_type: str = Form(...),
    file: UploadFile = File(...),
    user=Depends(get_current_user)
):
    if user.get("type") != "chauffeur":
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    if document_type not in ["permis_conduire", "permis_sejour", "piece_identite"]:
        raise HTTPException(status_code=400, detail="Type de document invalide")
    
    allowed_ext = [".jpg", ".jpeg", ".png", ".pdf"]
    ext = Path(file.filename).suffix.lower()
    if ext not in allowed_ext:
        raise HTTPException(status_code=400, detail="Format non supporté. Utilisez JPG, PNG ou PDF")
    
    if file.size and file.size > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Fichier trop volumineux (max 5 Mo)")
    
    file_id = str(uuid.uuid4())
    filename = f"{user['sub']}_{document_type}_{file_id}{ext}"
    filepath = UPLOAD_DIR / filename
    
    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)
    
    doc = {
        "id": file_id,
        "chauffeur_id": user["sub"],
        "document_type": document_type,
        "filename": filename,
        "original_name": file.filename,
        "file_size": len(content),
        "status": "pending",
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
        "verified_at": None,
        "verified_by": None
    }
    await db.chauffeur_documents.insert_one(doc)
    
    return {"status": "uploaded", "document_id": file_id, "document_type": document_type}

@api_router.get("/chauffeur/documents")
async def get_chauffeur_documents(user=Depends(get_current_user)):
    if user.get("type") != "chauffeur":
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    docs = await db.chauffeur_documents.find(
        {"chauffeur_id": user["sub"]}, {"_id": 0}
    ).sort("uploaded_at", -1).to_list(50)
    return docs

@api_router.get("/admin/chauffeur/{chauffeur_id}/documents")
async def admin_get_documents(chauffeur_id: str, user=Depends(get_current_user)):
    if user.get("type") != "admin":
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    docs = await db.chauffeur_documents.find(
        {"chauffeur_id": chauffeur_id}, {"_id": 0}
    ).sort("uploaded_at", -1).to_list(50)
    return docs

@api_router.post("/admin/document/{document_id}/verify")
async def admin_verify_document(document_id: str, status: str = Form(...), user=Depends(get_current_user)):
    if user.get("type") != "admin":
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    if status not in ["approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Statut invalide")
    
    result = await db.chauffeur_documents.update_one(
        {"id": document_id},
        {"$set": {
            "status": status,
            "verified_at": datetime.now(timezone.utc).isoformat(),
            "verified_by": user["sub"]
        }}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Document non trouvé")
    
    return {"status": status, "document_id": document_id}

@api_router.get("/uploads/{filename}")
async def serve_upload(filename: str, user=Depends(get_current_user)):
    filepath = UPLOAD_DIR / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Fichier non trouvé")
    
    from starlette.responses import FileResponse
    return FileResponse(filepath)

# ========== CHAT ==========

class ChatMessage(BaseModel):
    message: str = Field(min_length=1, max_length=500)

@api_router.post("/chat/{course_id}/send")
async def send_chat_message(course_id: str, msg: ChatMessage, user=Depends(get_current_user)):
    user_type = user.get("type")
    if user_type not in ["client", "chauffeur"]:
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    course = await db.client_commandes.find_one({"id": course_id}, {"_id": 0})
    if not course:
        raise HTTPException(status_code=404, detail="Course non trouvée")
    if course["status"] not in ["assigned", "in_progress"]:
        raise HTTPException(status_code=400, detail="Chat disponible uniquement pendant une course active")
    
    # Verify user is part of this course
    if user_type == "client" and course["client_id"] != user["sub"]:
        raise HTTPException(status_code=403, detail="Pas votre course")
    if user_type == "chauffeur" and course.get("chauffeur_id") != user["sub"]:
        raise HTTPException(status_code=403, detail="Pas votre course")
    
    chat_doc = {
        "id": str(uuid.uuid4()),
        "course_id": course_id,
        "sender_id": user["sub"],
        "sender_type": user_type,
        "sender_name": "",
        "message": msg.message,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "read": False
    }
    
    # Get sender name
    if user_type == "client":
        cl = await db.clients.find_one({"id": user["sub"]}, {"_id": 0})
        chat_doc["sender_name"] = f"{cl.get('prenom','')} {cl.get('nom','')}" if cl else "Client"
    else:
        ch = await db.chauffeurs.find_one(
            {"$or": [{"id": user["sub"]}, {"code_chauffeur": user.get("code")}]},
            {"_id": 0}
        )
        chat_doc["sender_name"] = f"{ch.get('prenom','')} {ch.get('nom','')}" if ch else "Chauffeur"
    
    await db.chat_messages.insert_one(chat_doc)
    
    return {
        "id": chat_doc["id"],
        "sender_type": user_type,
        "sender_name": chat_doc["sender_name"],
        "message": msg.message,
        "created_at": chat_doc["created_at"]
    }

@api_router.get("/chat/{course_id}/messages")
async def get_chat_messages(course_id: str, after: Optional[str] = None, user=Depends(get_current_user)):
    user_type = user.get("type")
    if user_type not in ["client", "chauffeur"]:
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    query = {"course_id": course_id}
    if after:
        query["created_at"] = {"$gt": after}
    
    messages = await db.chat_messages.find(query, {"_id": 0}).sort("created_at", 1).to_list(200)
    
    # Mark messages as read for the current user
    other_type = "chauffeur" if user_type == "client" else "client"
    await db.chat_messages.update_many(
        {"course_id": course_id, "sender_type": other_type, "read": False},
        {"$set": {"read": True}}
    )
    
    return {"messages": messages}

@api_router.get("/chat/{course_id}/unread")
async def get_unread_count(course_id: str, user=Depends(get_current_user)):
    user_type = user.get("type")
    other_type = "chauffeur" if user_type == "client" else "client"
    
    count = await db.chat_messages.count_documents({
        "course_id": course_id,
        "sender_type": other_type,
        "read": False
    })
    return {"unread": count}

# ========== HEALTH & ROOT ==========

@api_router.get("/")
async def root():
    return {"message": "TaxiG API", "version": "2.0.0"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

# Include router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
