# CAHIER DES CHARGES - TaxiG
## Application de Réservation de Taxi

---

## 1. PRÉSENTATION GÉNÉRALE

### 1.1 Description du Projet
**TaxiG** est une application web complète de réservation de taxi en temps réel, inspirée d'Uber/Bolt. Elle permet aux clients de commander un taxi, aux chauffeurs de recevoir et gérer les courses, et aux administrateurs de superviser l'ensemble de la plateforme.

### 1.2 Objectifs
- Permettre aux clients de réserver un taxi en quelques clics
- Offrir aux chauffeurs une interface intuitive pour gérer leurs courses
- Fournir à l'administration des outils de gestion et statistiques
- Calcul automatique des tarifs selon la distance et le temps

### 1.3 Stack Technique

| Composant | Technologie | Version |
|-----------|-------------|---------|
| **Frontend** | React.js | 18.x |
| **UI Components** | ShadCN/UI + Tailwind CSS | Latest |
| **Cartographie** | Leaflet + OpenStreetMap | 1.9.x |
| **Géocodage** | Google Maps API (Places, Directions) | v3 |
| **Backend** | FastAPI (Python) | 0.100+ |
| **Base de données** | MongoDB Atlas | Cloud |
| **Authentification** | JWT (JSON Web Tokens) | - |
| **Paiement** | Stripe | API v2024 |
| **PDF Export** | jsPDF + autoTable | 2.x / 5.x |

---

## 2. ARCHITECTURE TECHNIQUE

### 2.1 Architecture Globale
```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (React)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Client    │  │  Chauffeur  │  │   Administration    │  │
│  │  Dashboard  │  │  Dashboard  │  │     Dashboard       │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
└─────────┼────────────────┼───────────────────┼──────────────┘
          │                │                   │
          ▼                ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│                    API REST (FastAPI)                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐ │
│  │  Auth    │  │  Course  │  │ Chauffeur│  │    Admin     │ │
│  │ Routes   │  │  Routes  │  │  Routes  │  │   Routes     │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘ │
└───────┼─────────────┼────────────┼───────────────┼──────────┘
        │             │            │               │
        ▼             ▼            ▼               ▼
┌─────────────────────────────────────────────────────────────┐
│                    MongoDB Atlas                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐ │
│  │ clients  │  │chauffeurs│  │  courses │  │    admins    │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Structure des Fichiers
```
/app
├── backend/
│   ├── server.py          # API FastAPI principale
│   ├── requirements.txt   # Dépendances Python
│   └── .env              # Variables d'environnement
│
├── frontend/
│   ├── src/
│   │   ├── components/   # Composants UI réutilisables
│   │   │   └── ui/       # ShadCN components
│   │   ├── context/      # Context React (Auth)
│   │   ├── lib/          # Utilitaires et API client
│   │   │   └── api.js    # Appels API Axios
│   │   ├── pages/
│   │   │   ├── client/   # Pages client
│   │   │   ├── chauffeur/# Pages chauffeur
│   │   │   └── admin/    # Pages administration
│   │   ├── App.jsx       # Router principal
│   │   └── main.jsx      # Point d'entrée
│   └── package.json
│
└── CDC_TAXIG.md          # Ce document
```

---

## 3. MODÈLE DE DONNÉES

### 3.1 Collection `clients`
```javascript
{
  "_id": ObjectId,
  "id": "uuid-v4",
  "email": "client@email.com",
  "hashed_password": "bcrypt_hash",
  "prenom": "Jean",
  "nom": "Dupont",
  "telephone": "+33 6 12 34 56 78",
  "created_at": ISODate,
  "role": "client"
}
```

### 3.2 Collection `chauffeurs`
```javascript
{
  "_id": ObjectId,
  "id": "uuid-v4",
  "code_chauffeur": "TAXI001",      // Identifiant unique
  "hashed_password": "bcrypt_hash",
  "prenom": "Mohamed",
  "nom": "Ahmed",
  "telephone": "+41 79 123 45 67",
  "email": "chauffeur@taxig.ch",
  "vehicule": {
    "marque": "Mercedes",
    "modele": "E-Class",
    "immatriculation": "GE 123 456",
    "couleur": "Noir"
  },
  "is_online": true,                // Statut en service
  "status": "online",               // Alternative status
  "position": {                     // Position GPS actuelle
    "lat": 46.2044,
    "lng": 6.1432
  },
  "role": "chauffeur",
  "active": true
}
```

### 3.3 Collection `course_requests` (Courses)
```javascript
{
  "_id": ObjectId,
  "id": "uuid-v4",
  "commande_no": "TG-20260207-ABC123",
  "client_id": "client-uuid",
  "client_nom": "Jean Dupont",
  "chauffeur_id": "chauffeur-uuid",   // null si en attente
  
  // Localisation
  "pickup_lat": 46.2044,
  "pickup_lng": 6.1432,
  "pickup_address": "Gare de Genève",
  "destination_lat": 46.2200,
  "destination_lng": 6.1500,
  "destination_address": "Aéroport de Genève",
  
  // Tarification
  "distance_km": 8.5,
  "duration_minutes": 15,
  "prix_estime": 33.50,
  "prix_final": null,                 // Calculé à la fin
  
  // Statut
  "status": "pending",                // pending → assigned → in_progress → completed
  "payment_method": "cash",           // cash | card
  
  // Timestamps
  "created_at": ISODate,
  "assigned_at": ISODate,
  "started_at": ISODate,
  "completed_at": ISODate
}
```

### 3.4 Collection `admins`
```javascript
{
  "_id": ObjectId,
  "username": "naim",
  "hashed_password": "bcrypt_hash",
  "role": "admin",
  "created_at": ISODate
}
```

---

## 4. ALGORITHMES ET LOGIQUE MÉTIER

### 4.1 Algorithme de Tarification

```python
# Constantes de tarification
BASE_FARE = 6.30          # Tarif de base (€)
PRICE_PER_KM = 3.20       # Prix par kilomètre (€)
TRAFFIC_RATE = 0.50       # Supplément feux rouges (€/min)
WAIT_RATE = 0.70          # Attente client (€/min)

def calculate_fare(distance_km, duration_minutes, wait_minutes=0):
    """
    Calcule le tarif d'une course
    
    Formule:
    Prix = Base + (Distance × Prix/km) + (Temps_trafic × Taux_trafic) + (Attente × Taux_attente)
    """
    base = BASE_FARE
    distance_fare = distance_km * PRICE_PER_KM
    
    # Estimation temps dans le trafic (30% du temps total)
    traffic_minutes = duration_minutes * 0.3
    traffic_fare = traffic_minutes * TRAFFIC_RATE
    
    # Attente client
    wait_fare = wait_minutes * WAIT_RATE
    
    total = base + distance_fare + traffic_fare + wait_fare
    
    return {
        "base_fare": round(base, 2),
        "distance_fare": round(distance_fare, 2),
        "traffic_fare": round(traffic_fare, 2),
        "wait_fare": round(wait_fare, 2),
        "estimated_total": round(total, 2)
    }

# Exemple: Paris → Lyon (465 km, 280 min)
# Prix = 6.30 + (465 × 3.20) + (84 × 0.50) = 6.30 + 1488 + 42 = 1536.30€
```

### 4.2 Algorithme de Dispatch (Attribution Chauffeur)

```python
from math import radians, cos, sin, asin, sqrt

def haversine_distance(lat1, lon1, lat2, lon2):
    """
    Calcule la distance en km entre deux points GPS
    Formule de Haversine pour la distance sur une sphère
    """
    R = 6371  # Rayon de la Terre en km
    
    # Conversion en radians
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    
    # Différences
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    
    # Formule de Haversine
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    
    return R * c

async def find_nearest_chauffeur(pickup_lat, pickup_lng):
    """
    Trouve le chauffeur disponible le plus proche
    
    Algorithme:
    1. Récupérer tous les chauffeurs en ligne avec position
    2. Calculer la distance de chacun au point de prise en charge
    3. Trier par distance croissante
    4. Retourner le plus proche
    """
    chauffeurs = await db.chauffeurs.find({
        "$or": [{"is_online": True}, {"status": "online"}],
        "position": {"$ne": None}
    }).to_list(100)
    
    if not chauffeurs:
        return None
    
    # Calculer distances
    for c in chauffeurs:
        pos = c.get("position", {})
        c["distance"] = haversine_distance(
            pickup_lat, pickup_lng,
            pos.get("lat", 0), pos.get("lng", 0)
        )
    
    # Trier et retourner le plus proche
    chauffeurs.sort(key=lambda x: x["distance"])
    return chauffeurs[0]
```

### 4.3 Algorithme de Calcul d'Itinéraire (Frontend)

```javascript
// Utilisation de Google Directions API
async function calculateRoute(origin, destination) {
  const directionsService = new google.maps.DirectionsService();
  
  const result = await new Promise((resolve, reject) => {
    directionsService.route({
      origin: { lat: origin.lat, lng: origin.lng },
      destination: { lat: destination.lat, lng: destination.lng },
      travelMode: google.maps.TravelMode.DRIVING
    }, (res, status) => {
      if (status === 'OK') resolve(res);
      else reject(status);
    });
  });
  
  // Extraire les informations
  const route = result.routes[0];
  const leg = route.legs[0];
  
  return {
    distance: leg.distance.value / 1000,  // km
    duration: leg.duration.value / 60,     // minutes
    polyline: decodePolyline(route.overview_polyline.points),
    eta: calculateETA(leg.duration.value)
  };
}

// Décodage du polyline Google (algorithme de décompression)
function decodePolyline(encoded) {
  const points = [];
  let lat = 0, lng = 0;
  let index = 0;
  
  while (index < encoded.length) {
    // Décoder latitude
    let shift = 0, result = 0, byte;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);
    
    // Décoder longitude
    shift = 0; result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);
    
    points.push([lat / 1e5, lng / 1e5]);
  }
  
  return points;
}
```

---

## 5. FLUX FONCTIONNELS

### 5.1 Flux de Commande Client

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLUX COMMANDE CLIENT                          │
└─────────────────────────────────────────────────────────────────┘

    CLIENT                          SERVEUR                    CHAUFFEUR
      │                                │                           │
      │ 1. Ouvre l'app                 │                           │
      │ ─────────────────────────────► │                           │
      │                                │                           │
      │ 2. Géolocalisation activée     │                           │
      │ ◄───────────────────────────── │                           │
      │    Position GPS obtenue        │                           │
      │                                │                           │
      │ 3. Saisit destination          │                           │
      │    (Autocomplete Google)       │                           │
      │                                │                           │
      │ 4. POST /api/course/estimate   │                           │
      │ ─────────────────────────────► │                           │
      │ ◄───────────────────────────── │                           │
      │    Prix estimé: 25.50€         │                           │
      │    Distance: 6.2 km            │                           │
      │    Durée: ~12 min              │                           │
      │                                │                           │
      │ 5. Confirme la commande        │                           │
      │    POST /api/course/create     │                           │
      │ ─────────────────────────────► │                           │
      │                                │ 6. Recherche chauffeur    │
      │                                │    le plus proche         │
      │                                │ ─────────────────────────►│
      │                                │                           │
      │                                │ 7. Notification course    │
      │                                │ ─────────────────────────►│
      │                                │                           │
      │                                │ 8. Chauffeur accepte      │
      │                                │ ◄─────────────────────────│
      │                                │                           │
      │ 9. Course confirmée            │                           │
      │ ◄───────────────────────────── │                           │
      │    Chauffeur: Mohamed          │                           │
      │    ETA: 5 min                  │                           │
      │                                │                           │
      │ 10. Suivi temps réel           │                           │
      │ ◄─────────────────────────────►│◄─────────────────────────►│
      │    (Polling toutes les 3s)     │                           │
      │                                │                           │
      │ 11. Arrivée chauffeur          │                           │
      │ ◄───────────────────────────── │ ◄─────────────────────────│
      │                                │    Course démarrée        │
      │                                │                           │
      │ 12. Fin de course              │                           │
      │ ◄───────────────────────────── │ ◄─────────────────────────│
      │    Prix final: 27.30€          │    Course terminée        │
      │                                │                           │
      │ 13. Paiement                   │                           │
      │    (Cash ou Stripe)            │                           │
      ▼                                ▼                           ▼
```

### 5.2 États d'une Course

```
┌──────────┐     Chauffeur      ┌──────────┐     Arrivée      ┌─────────────┐
│ PENDING  │ ──── accepte ────► │ ASSIGNED │ ──── client ───► │ IN_PROGRESS │
└──────────┘                    └──────────┘                  └─────────────┘
     │                               │                              │
     │ Timeout                       │ Chauffeur                    │ Arrivée
     │ ou refus                      │ annule                       │ destination
     ▼                               ▼                              ▼
┌───────────┐                  ┌───────────┐                  ┌───────────┐
│ CANCELLED │                  │ CANCELLED │                  │ COMPLETED │
└───────────┘                  └───────────┘                  └───────────┘
```

---

## 6. API ENDPOINTS

### 6.1 Authentification

| Méthode | Endpoint | Description | Body |
|---------|----------|-------------|------|
| POST | `/api/client/register` | Inscription client | `{email, password, prenom, nom}` |
| POST | `/api/client/login` | Connexion client | `{email, password}` |
| POST | `/api/chauffeur/login` | Connexion chauffeur | `{code_chauffeur, password}` |
| POST | `/api/admin/login` | Connexion admin | `{username, password}` |

### 6.2 Courses

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| POST | `/api/course/estimate` | Estimer le prix | Client |
| POST | `/api/course/create` | Créer une course | Client |
| GET | `/api/course/{id}` | Détails course | Client/Chauffeur |
| POST | `/api/course/{id}/cancel` | Annuler | Client |

### 6.3 Chauffeur

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| GET | `/api/chauffeur/profile` | Profil chauffeur | Chauffeur |
| POST | `/api/chauffeur/status` | Changer statut online/offline | Chauffeur |
| POST | `/api/chauffeur/position` | Mettre à jour position GPS | Chauffeur |
| GET | `/api/chauffeur/pending-course` | Course en attente | Chauffeur |
| POST | `/api/chauffeur/course/{id}/respond` | Accepter/Refuser | Chauffeur |
| POST | `/api/chauffeur/course/{id}/start` | Démarrer course | Chauffeur |
| POST | `/api/chauffeur/course/{id}/complete` | Terminer course | Chauffeur |
| GET | `/api/chauffeur/revenus` | Statistiques revenus | Chauffeur |
| GET | `/api/chauffeur/commandes` | Historique courses | Chauffeur |

### 6.4 Administration

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| GET | `/api/admin/stats` | Statistiques globales | Admin |
| GET | `/api/admin/chauffeurs` | Liste chauffeurs | Admin |
| POST | `/api/admin/chauffeurs` | Créer chauffeur | Admin |
| GET | `/api/admin/clients` | Liste clients | Admin |
| GET | `/api/admin/courses` | Toutes les courses | Admin |

---

## 7. FONCTIONNALITÉS DÉTAILLÉES

### 7.1 Interface Client

#### 7.1.1 Carte Interactive
- **Technologie**: Leaflet + OpenStreetMap
- **Fonctionnalités**:
  - Affichage position client (marker bleu)
  - Affichage chauffeurs disponibles (markers taxi jaune)
  - Tracé de l'itinéraire (polyline bleu)
  - Zoom désactivé sur scroll (évite dezoom accidentel)
  - Centrage automatique sur position GPS

#### 7.1.2 Recherche d'Adresse
- **Technologie**: Google Places Autocomplete API
- **Fonctionnement**:
  1. Client tape une adresse
  2. Suggestions en temps réel
  3. Sélection → Géocodage (lat/lng)
  4. Calcul itinéraire via Directions API

#### 7.1.3 Estimation de Prix
```
┌─────────────────────────────────────┐
│         ESTIMATION PRIX             │
├─────────────────────────────────────┤
│ Départ: Gare de Genève              │
│ Arrivée: Aéroport GVA               │
│                                     │
│ Distance: 8.5 km                    │
│ Durée estimée: ~15 min              │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Prix estimé: 33.50€             │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [ESPÈCES]          [CARTE]          │
│                                     │
│ [    COMMANDER MAINTENANT    ]      │
└─────────────────────────────────────┘
```

### 7.2 Interface Chauffeur

#### 7.2.1 Système de Notification
- **Polling** toutes les 3 secondes
- **Son de notification** à la réception d'une course
- **Dialog modal** avec détails:
  - Adresse de prise en charge
  - Destination
  - Prix estimé
  - Distance/Durée
  - Boutons Accepter/Refuser

#### 7.2.2 Navigation GPS
- **Carte centrée sur le chauffeur** en permanence
- **Suivi temps réel** de la position
- **Itinéraire coloré** vers le client puis la destination
- **Chronomètre** temps écoulé de la course

#### 7.2.3 Export PDF Comptabilité
- **Technologie**: jsPDF + autoTable
- **Contenu**:
  - En-tête TaxiG brandé
  - Informations chauffeur
  - Période du rapport
  - Résumé financier (brut, commission, net)
  - Détail des courses

### 7.3 Interface Administration

#### 7.3.1 Dashboard Statistiques
- Nombre total de chauffeurs
- Nombre total de clients
- Courses du jour/semaine/mois
- Revenus totaux
- Commission TaxiG (15%)

#### 7.3.2 Gestion Chauffeurs
- Liste avec statut (online/offline)
- Création de nouveaux chauffeurs
- Attribution de codes uniques
- Historique des courses par chauffeur

---

## 8. SÉCURITÉ

### 8.1 Authentification JWT
```python
# Génération du token
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=24)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm="HS256")

# Vérification du token
def verify_token(token: str):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Token invalide")
```

### 8.2 Hashage des Mots de Passe
```python
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Hashage
hashed = pwd_context.hash("mot_de_passe")

# Vérification
is_valid = pwd_context.verify("mot_de_passe", hashed)
```

### 8.3 Protection des Routes
- Middleware d'authentification sur toutes les routes sensibles
- Vérification du rôle (client/chauffeur/admin)
- Validation des données entrantes (Pydantic)

---

## 9. CONFIGURATION

### 9.1 Variables d'Environnement Backend
```env
MONGO_URL="mongodb+srv://..."
DB_NAME="taxi"
JWT_SECRET="votre_secret_jwt"
STRIPE_API_KEY="sk_live_..."
STRIPE_PUBLIC_KEY="pk_live_..."
GOOGLE_MAPS_API_KEY="AIza..."
CORS_ORIGINS="*"
```

### 9.2 Variables d'Environnement Frontend
```env
REACT_APP_BACKEND_URL="https://votre-domaine.com"
REACT_APP_GOOGLE_MAPS_API_KEY="AIza..."
```

---

## 10. IDENTIFIANTS DE TEST

| Rôle | Identifiant | Mot de passe |
|------|-------------|--------------|
| Client | jean.dupont@test.com | test123 |
| Chauffeur Principal | TAXI001 | chauffeur123 |
| Chauffeurs Genève | GVA001 à GVA040 | test123 |
| Admin | naim | admin123 |

---

## 11. ÉVOLUTIONS FUTURES

### 11.1 Priorité Haute (P1)
- [ ] Intégration paiement Stripe complète
- [ ] Notifications push navigateur
- [ ] Système de notation 5 étoiles

### 11.2 Priorité Moyenne (P2)
- [ ] Upload documents chauffeur
- [ ] Chat client-chauffeur
- [ ] Historique détaillé avec factures

### 11.3 Priorité Basse (P3)
- [ ] Application mobile native (React Native)
- [ ] Multi-langue
- [ ] Programme de fidélité

---

## 12. CONTACT & SUPPORT

**Application**: TaxiG
**Version**: 1.0.0
**Date**: Février 2026

---

*Document généré automatiquement - TaxiG Platform*
