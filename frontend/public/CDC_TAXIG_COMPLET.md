# CAHIER DES CHARGES TECHNIQUE COMPLET
# Application TaxiG - Plateforme de Réservation de Taxi

---

## TABLE DES MATIÈRES

1. [Présentation du Projet](#1-présentation-du-projet)
2. [Architecture Système](#2-architecture-système)
3. [Modèle de Données](#3-modèle-de-données)
4. [Algorithmes Détaillés](#4-algorithmes-détaillés)
5. [Flux Fonctionnels](#5-flux-fonctionnels)
6. [Interfaces Utilisateur](#6-interfaces-utilisateur)
7. [API REST Complète](#7-api-rest-complète)
8. [Sécurité](#8-sécurité)
9. [Configuration](#9-configuration)
10. [Tests et Validation](#10-tests-et-validation)

---

# 1. PRÉSENTATION DU PROJET

## 1.1 Vue d'Ensemble

**TaxiG** est une plateforme complète de réservation de taxi en temps réel, conçue pour connecter clients, chauffeurs et administrateurs via une interface web moderne et intuitive.

### Objectifs Principaux
- Permettre aux clients de commander un taxi en moins de 30 secondes
- Optimiser l'attribution des courses aux chauffeurs les plus proches
- Fournir un suivi GPS en temps réel
- Automatiser le calcul des tarifs
- Offrir des outils de gestion pour l'administration

### Acteurs du Système

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ÉCOSYSTÈME TAXIG                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌──────────┐        ┌──────────┐        ┌──────────────┐          │
│   │  CLIENT  │        │CHAUFFEUR │        │    ADMIN     │          │
│   │          │        │          │        │              │          │
│   │ • Réserve│        │ • Accepte│        │ • Supervise  │          │
│   │ • Suit   │        │ • Conduit│        │ • Gère       │          │
│   │ • Paie   │        │ • Facture│        │ • Analyse    │          │
│   └────┬─────┘        └────┬─────┘        └──────┬───────┘          │
│        │                   │                     │                   │
│        └───────────────────┼─────────────────────┘                   │
│                            │                                         │
│                    ┌───────▼───────┐                                 │
│                    │   PLATEFORME  │                                 │
│                    │    TAXIG      │                                 │
│                    └───────────────┘                                 │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## 1.2 Stack Technologique Détaillée

### Frontend (Application Web)

| Technologie | Version | Rôle |
|-------------|---------|------|
| React.js | 18.x | Framework UI principal |
| Vite | 5.x | Build tool et dev server |
| Tailwind CSS | 3.x | Framework CSS utilitaire |
| ShadCN/UI | Latest | Composants UI préfabriqués |
| Leaflet | 1.9.x | Bibliothèque cartographique |
| React-Leaflet | 4.x | Intégration React pour Leaflet |
| Axios | 1.x | Client HTTP pour API calls |
| React Router | 6.x | Gestion du routing |
| Sonner | Latest | Système de notifications toast |
| jsPDF | 2.x | Génération de PDF côté client |
| Lucide React | Latest | Bibliothèque d'icônes |

### Backend (API REST)

| Technologie | Version | Rôle |
|-------------|---------|------|
| Python | 3.11 | Langage principal |
| FastAPI | 0.100+ | Framework API REST |
| Uvicorn | 0.23+ | Serveur ASGI |
| Motor | 3.x | Driver MongoDB asynchrone |
| Pydantic | 2.x | Validation des données |
| PyJWT | 2.x | Gestion des tokens JWT |
| Passlib | 1.7.x | Hashage des mots de passe |
| Bcrypt | 4.x | Algorithme de hashage |

### Base de Données

| Technologie | Type | Rôle |
|-------------|------|------|
| MongoDB Atlas | NoSQL Document | Stockage principal |
| Collections | 5 | clients, chauffeurs, courses, admins, pointages |

### Services Externes

| Service | API | Utilisation |
|---------|-----|-------------|
| Google Maps | Places API | Autocomplete adresses |
| Google Maps | Directions API | Calcul itinéraires |
| Google Maps | Geocoding API | Conversion adresse ↔ coordonnées |
| OpenStreetMap | Tiles | Affichage cartographique |
| Stripe | Payments API | Paiements par carte |

---

# 2. ARCHITECTURE SYSTÈME

## 2.1 Architecture Globale

```
┌────────────────────────────────────────────────────────────────────────────┐
│                           ARCHITECTURE TAXIG                                │
└────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────┐
                              │   CLIENTS   │
                              │  (Mobiles/  │
                              │    Web)     │
                              └──────┬──────┘
                                     │
                                     │ HTTPS
                                     ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                            COUCHE PRÉSENTATION                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                         REACT APPLICATION                             │  │
│  │                                                                       │  │
│  │   ┌─────────────┐   ┌─────────────┐   ┌─────────────────────────┐   │  │
│  │   │   Client    │   │  Chauffeur  │   │    Administration       │   │  │
│  │   │  Dashboard  │   │  Dashboard  │   │      Dashboard          │   │  │
│  │   │             │   │             │   │                         │   │  │
│  │   │ • Carte     │   │ • Carte GPS │   │ • Stats                 │   │  │
│  │   │ • Réserv.   │   │ • Courses   │   │ • Gestion chauffeurs    │   │  │
│  │   │ • Historiq. │   │ • Revenus   │   │ • Gestion clients       │   │  │
│  │   │ • Profil    │   │ • Calendar  │   │ • Courses               │   │  │
│  │   └─────────────┘   └─────────────┘   └─────────────────────────┘   │  │
│  │                                                                       │  │
│  │   ┌───────────────────────────────────────────────────────────────┐  │  │
│  │   │                    COMPOSANTS PARTAGÉS                        │  │  │
│  │   │  • AuthContext  • API Client  • UI Components  • Maps         │  │  │
│  │   └───────────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     │ API REST (JSON)
                                     │ /api/*
                                     ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                            COUCHE APPLICATION                               │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                         FASTAPI SERVER                                │  │
│  │                                                                       │  │
│  │   ┌─────────────┐   ┌─────────────┐   ┌─────────────────────────┐   │  │
│  │   │    Auth     │   │   Course    │   │       Chauffeur         │   │  │
│  │   │   Routes    │   │   Routes    │   │        Routes           │   │  │
│  │   │             │   │             │   │                         │   │  │
│  │   │ • Login     │   │ • Estimate  │   │ • Profile               │   │  │
│  │   │ • Register  │   │ • Create    │   │ • Status                │   │  │
│  │   │ • Verify    │   │ • Track     │   │ • Position              │   │  │
│  │   └─────────────┘   └─────────────┘   └─────────────────────────┘   │  │
│  │                                                                       │  │
│  │   ┌───────────────────────────────────────────────────────────────┐  │  │
│  │   │                    SERVICES MÉTIER                            │  │  │
│  │   │  • Tarification  • Dispatch  • Géolocalisation  • Paiement   │  │  │
│  │   └───────────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     │ MongoDB Protocol
                                     ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                            COUCHE DONNÉES                                   │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                       MONGODB ATLAS CLUSTER                           │  │
│  │                                                                       │  │
│  │   ┌─────────┐  ┌───────────┐  ┌─────────┐  ┌────────┐  ┌─────────┐  │  │
│  │   │ clients │  │chauffeurs │  │ courses │  │ admins │  │pointages│  │  │
│  │   └─────────┘  └───────────┘  └─────────┘  └────────┘  └─────────┘  │  │
│  │                                                                       │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────┘
```

## 2.2 Structure des Fichiers

```
/app
│
├── backend/
│   ├── server.py              # Point d'entrée API FastAPI
│   │   ├── Configuration      # MongoDB, JWT, CORS
│   │   ├── Models Pydantic    # Validation des requêtes
│   │   ├── Routes Auth        # /api/client/*, /api/chauffeur/*
│   │   ├── Routes Course      # /api/course/*
│   │   ├── Routes Admin       # /api/admin/*
│   │   └── Algorithmes        # Tarification, Dispatch
│   │
│   ├── requirements.txt       # Dépendances Python
│   └── .env                   # Variables d'environnement
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── ui/            # Composants ShadCN
│   │   │       ├── button.jsx
│   │   │       ├── card.jsx
│   │   │       ├── dialog.jsx
│   │   │       ├── sheet.jsx
│   │   │       └── ...
│   │   │
│   │   ├── context/
│   │   │   └── AuthContext.jsx  # Gestion authentification globale
│   │   │
│   │   ├── lib/
│   │   │   └── api.js          # Client Axios configuré
│   │   │
│   │   ├── pages/
│   │   │   ├── client/
│   │   │   │   ├── ClientDashboard.jsx   # Dashboard principal client
│   │   │   │   ├── ClientCourse.jsx      # Suivi de course
│   │   │   │   ├── ClientLogin.jsx       # Page de connexion
│   │   │   │   └── ClientRegister.jsx    # Page d'inscription
│   │   │   │
│   │   │   ├── chauffeur/
│   │   │   │   ├── ChauffeurDashboard.jsx # Dashboard chauffeur
│   │   │   │   └── ChauffeurLogin.jsx     # Connexion chauffeur
│   │   │   │
│   │   │   └── admin/
│   │   │       ├── AdminDashboard.jsx    # Dashboard admin
│   │   │       ├── ChauffeursPage.jsx    # Gestion chauffeurs
│   │   │       ├── ClientsPage.jsx       # Gestion clients
│   │   │       └── RidesPage.jsx         # Historique courses
│   │   │
│   │   ├── App.jsx             # Router principal
│   │   ├── main.jsx            # Point d'entrée React
│   │   └── index.css           # Styles globaux + Tailwind
│   │
│   ├── public/
│   │   └── assets/             # Images, logos
│   │
│   └── package.json            # Dépendances Node.js
│
└── CDC_TAXIG_COMPLET.md        # Ce document
```

## 2.3 Flux de Communication

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        FLUX DE COMMUNICATION                                 │
└─────────────────────────────────────────────────────────────────────────────┘

  CLIENT                    SERVEUR                      BASE DE DONNÉES
    │                          │                               │
    │  1. Requête HTTP         │                               │
    │  POST /api/course/create │                               │
    │  {pickup, destination}   │                               │
    │ ─────────────────────────►                               │
    │                          │                               │
    │                          │  2. Validation Pydantic       │
    │                          │  ────────────────────         │
    │                          │                               │
    │                          │  3. Query MongoDB             │
    │                          │  Find nearest chauffeur       │
    │                          │ ─────────────────────────────►│
    │                          │                               │
    │                          │  4. Résultat                  │
    │                          │◄───────────────────────────── │
    │                          │                               │
    │                          │  5. Insert course             │
    │                          │ ─────────────────────────────►│
    │                          │                               │
    │  6. Réponse JSON         │                               │
    │  {course_id, status}     │                               │
    │◄───────────────────────── │                               │
    │                          │                               │
    │  7. WebSocket/Polling    │                               │
    │  (Suivi temps réel)      │                               │
    │◄─────────────────────────►│                               │
    │                          │                               │
```

---

# 3. MODÈLE DE DONNÉES

## 3.1 Schéma Entité-Relation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        MODÈLE ENTITÉ-RELATION                                │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────┐                                    ┌──────────────┐
    │    CLIENT    │                                    │  CHAUFFEUR   │
    ├──────────────┤                                    ├──────────────┤
    │ PK id        │                                    │ PK id        │
    │    email     │                                    │    code      │
    │    password  │                                    │    password  │
    │    prenom    │                                    │    prenom    │
    │    nom       │                                    │    nom       │
    │    telephone │                                    │    telephone │
    │    created_at│                                    │    vehicule  │
    └──────┬───────┘                                    │    position  │
           │                                            │    is_online │
           │ 1                                          └──────┬───────┘
           │                                                   │
           │ commande                              attribué à  │ 1
           │                                                   │
           │ N                                                 │
    ┌──────▼───────────────────────────────────────────────────▼──────┐
    │                            COURSE                                │
    ├─────────────────────────────────────────────────────────────────┤
    │ PK id                                                           │
    │ FK client_id ─────────────────────────────► CLIENT.id           │
    │ FK chauffeur_id ──────────────────────────► CHAUFFEUR.id        │
    │    commande_no                                                  │
    │    pickup_address, pickup_lat, pickup_lng                       │
    │    destination_address, destination_lat, destination_lng        │
    │    distance_km                                                  │
    │    duration_minutes                                             │
    │    prix_estime                                                  │
    │    prix_final                                                   │
    │    status (pending/assigned/in_progress/completed/cancelled)    │
    │    payment_method (cash/card)                                   │
    │    created_at, assigned_at, started_at, completed_at            │
    └─────────────────────────────────────────────────────────────────┘
                                    │
                                    │ génère
                                    ▼
                           ┌───────────────┐
                           │   POINTAGE    │
                           ├───────────────┤
                           │ PK id         │
                           │ FK chauffeur_id
                           │    action     │
                           │    timestamp  │
                           └───────────────┘
```

## 3.2 Collections MongoDB Détaillées

### Collection `clients`

```javascript
{
  "_id": ObjectId("..."),           // ID MongoDB auto-généré
  "id": "550e8400-e29b-41d4-a716-446655440000",  // UUID v4
  
  // Informations personnelles
  "email": "jean.dupont@email.com",
  "hashed_password": "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.rrhB9Z3bW2m9Ey",
  "prenom": "Jean",
  "nom": "Dupont",
  "telephone": "+33 6 12 34 56 78",
  
  // Métadonnées
  "role": "client",
  "created_at": ISODate("2026-02-07T10:30:00Z"),
  "last_login": ISODate("2026-02-07T14:22:00Z"),
  
  // Statistiques (calculées)
  "total_courses": 15,
  "total_depense": 342.50
}
```

### Collection `chauffeurs`

```javascript
{
  "_id": ObjectId("..."),
  "id": "17ad2f66-26c7-46ed-927e-d5d6f55ca88b",
  
  // Identification
  "code_chauffeur": "TAXI001",      // Code unique pour connexion
  "hashed_password": "$2b$12$...",
  
  // Informations personnelles
  "prenom": "Mohamed",
  "nom": "Ahmed",
  "telephone": "+41 79 123 45 67",
  "email": "mohamed.ahmed@taxig.ch",
  
  // Véhicule
  "vehicule": {
    "marque": "Mercedes",
    "modele": "E-Class",
    "annee": 2022,
    "immatriculation": "GE 123 456",
    "couleur": "Noir",
    "places": 4
  },
  
  // Statut temps réel
  "is_online": true,                // En service ou non
  "status": "online",               // Redondance pour compatibilité
  "position": {                     // Position GPS actuelle
    "lat": 46.2044,
    "lng": 6.1432,
    "updated_at": ISODate("2026-02-07T14:30:00Z")
  },
  
  // Documents (optionnel)
  "permis_conduire": "base64_encoded_image",
  "permis_sejour": "base64_encoded_image",
  
  // Métadonnées
  "role": "chauffeur",
  "active": true,
  "created_at": ISODate("2026-01-15T09:00:00Z"),
  
  // Statistiques
  "total_courses": 156,
  "note_moyenne": 4.8,
  "revenus_total": 12450.00
}
```

### Collection `course_requests` (Courses)

```javascript
{
  "_id": ObjectId("..."),
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  
  // Numéro de commande lisible
  "commande_no": "TG-20260207-ABC123",
  
  // Relations
  "client_id": "550e8400-e29b-41d4-a716-446655440000",
  "client_nom": "Jean Dupont",           // Dénormalisé pour affichage
  "client_telephone": "+33 6 12 34 56 78",
  "chauffeur_id": "17ad2f66-26c7-46ed-927e-d5d6f55ca88b",  // null si pending
  "chauffeur_nom": "Mohamed Ahmed",
  
  // Point de départ
  "pickup_lat": 46.2044,
  "pickup_lng": 6.1432,
  "pickup_address": "Gare de Genève-Cornavin, Place de Cornavin, Genève",
  
  // Destination
  "destination_lat": 46.2381,
  "destination_lng": 6.1090,
  "destination_address": "Aéroport International de Genève, Route de l'Aéroport",
  
  // Calculs
  "distance_km": 5.8,
  "duration_minutes": 12,
  
  // Tarification
  "prix_estime": 26.86,              // Calculé à la création
  "prix_final": 28.50,               // Calculé à la fin (peut inclure attente)
  "details_prix": {
    "base": 6.30,
    "distance": 18.56,               // 5.8 km × 3.20 €
    "trafic": 1.80,                  // 3.6 min × 0.50 €
    "attente": 1.84                  // 2.63 min × 0.70 €
  },
  
  // Paiement
  "payment_method": "cash",          // cash | card
  "payment_status": "pending",       // pending | completed | failed
  "stripe_payment_id": null,         // Si paiement carte
  
  // Statut de la course
  "status": "completed",
  // Valeurs possibles:
  // - "pending"     : En attente d'attribution
  // - "assigned"    : Chauffeur assigné, en route vers client
  // - "in_progress" : Client récupéré, en route vers destination
  // - "completed"   : Course terminée
  // - "cancelled"   : Annulée
  
  // Timestamps
  "created_at": ISODate("2026-02-07T14:00:00Z"),
  "assigned_at": ISODate("2026-02-07T14:00:15Z"),
  "pickup_at": ISODate("2026-02-07T14:05:30Z"),    // Arrivée chez client
  "started_at": ISODate("2026-02-07T14:08:00Z"),   // Début course
  "completed_at": ISODate("2026-02-07T14:20:00Z")
}
```

### Collection `admins`

```javascript
{
  "_id": ObjectId("..."),
  "username": "naim",
  "hashed_password": "$2b$12$...",
  "role": "admin",
  "permissions": ["read", "write", "delete", "manage_users"],
  "created_at": ISODate("2026-01-01T00:00:00Z")
}
```

### Collection `pointages`

```javascript
{
  "_id": ObjectId("..."),
  "chauffeur_id": "17ad2f66-26c7-46ed-927e-d5d6f55ca88b",
  "chauffeur_nom": "Mohamed Ahmed",
  "action": "start_service",         // start_service | end_service
  "timestamp": ISODate("2026-02-07T08:00:00Z"),
  "position": {
    "lat": 46.2044,
    "lng": 6.1432
  }
}
```

---

# 4. ALGORITHMES DÉTAILLÉS

## 4.1 Algorithme de Tarification

### Formule Complète

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      FORMULE DE TARIFICATION                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   PRIX_TOTAL = TARIF_BASE + TARIF_DISTANCE + TARIF_TRAFIC + TARIF_ATTENTE   │
│                                                                              │
│   Où:                                                                        │
│   • TARIF_BASE     = 6.30 €                                                 │
│   • TARIF_DISTANCE = distance_km × 3.20 €/km                                │
│   • TARIF_TRAFIC   = (durée_minutes × 0.30) × 0.50 €/min                    │
│   • TARIF_ATTENTE  = attente_minutes × 0.70 €/min                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Constantes

```python
# Configuration tarifaire
TARIF_BASE = 6.30          # Prise en charge (€)
TARIF_KM = 3.20            # Prix par kilomètre (€/km)
TARIF_TRAFIC = 0.50        # Temps dans le trafic (€/min)
TARIF_ATTENTE = 0.70       # Attente client (€/min)
RATIO_TRAFIC = 0.30        # 30% du temps estimé en trafic

# Commission plateforme
COMMISSION_TAXIG = 0.15    # 15% du prix total
```

### Implémentation Python

```python
def calculate_fare(distance_km: float, duration_minutes: float, wait_minutes: float = 0) -> dict:
    """
    Calcule le tarif d'une course de taxi.
    
    Paramètres:
    -----------
    distance_km : float
        Distance totale du trajet en kilomètres
    duration_minutes : float
        Durée estimée du trajet en minutes
    wait_minutes : float (optionnel)
        Temps d'attente du client en minutes (défaut: 0)
    
    Retourne:
    ---------
    dict : Détail complet de la tarification
    
    Exemple:
    --------
    >>> calculate_fare(distance_km=10.5, duration_minutes=25, wait_minutes=3)
    {
        "base_fare": 6.30,
        "distance_fare": 33.60,
        "traffic_fare": 3.75,
        "wait_fare": 2.10,
        "estimated_total": 45.75,
        "commission": 6.86,
        "chauffeur_net": 38.89
    }
    """
    
    # 1. Tarif de base (prise en charge)
    base_fare = TARIF_BASE
    
    # 2. Tarif distance
    distance_fare = distance_km * TARIF_KM
    
    # 3. Tarif trafic (estimation: 30% du temps en feux rouges/embouteillages)
    traffic_minutes = duration_minutes * RATIO_TRAFIC
    traffic_fare = traffic_minutes * TARIF_TRAFIC
    
    # 4. Tarif attente client
    wait_fare = wait_minutes * TARIF_ATTENTE
    
    # 5. Total
    total = base_fare + distance_fare + traffic_fare + wait_fare
    
    # 6. Commission TaxiG
    commission = total * COMMISSION_TAXIG
    chauffeur_net = total - commission
    
    return {
        "base_fare": round(base_fare, 2),
        "distance_fare": round(distance_fare, 2),
        "traffic_fare": round(traffic_fare, 2),
        "wait_fare": round(wait_fare, 2),
        "estimated_total": round(total, 2),
        "commission": round(commission, 2),
        "chauffeur_net": round(chauffeur_net, 2)
    }
```

### Exemples de Calcul

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      EXEMPLES DE TARIFICATION                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  EXEMPLE 1: Course courte (Gare → Centre-ville)                             │
│  ─────────────────────────────────────────────────                          │
│  Distance: 3 km | Durée: 8 min | Attente: 0 min                             │
│                                                                              │
│  Base:        6.30 €                                                        │
│  Distance:    3 × 3.20 = 9.60 €                                             │
│  Trafic:      8 × 0.30 × 0.50 = 1.20 €                                      │
│  ─────────────────────────────────                                          │
│  TOTAL:       17.10 €                                                       │
│                                                                              │
│  Commission TaxiG (15%): 2.57 €                                             │
│  Net chauffeur: 14.53 €                                                     │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  EXEMPLE 2: Course moyenne (Genève → Aéroport)                              │
│  ─────────────────────────────────────────────────                          │
│  Distance: 5.8 km | Durée: 15 min | Attente: 2 min                          │
│                                                                              │
│  Base:        6.30 €                                                        │
│  Distance:    5.8 × 3.20 = 18.56 €                                          │
│  Trafic:      15 × 0.30 × 0.50 = 2.25 €                                     │
│  Attente:     2 × 0.70 = 1.40 €                                             │
│  ─────────────────────────────────                                          │
│  TOTAL:       28.51 €                                                       │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  EXEMPLE 3: Course longue (Genève → Lyon)                                   │
│  ─────────────────────────────────────────────────                          │
│  Distance: 150 km | Durée: 105 min | Attente: 0 min                         │
│                                                                              │
│  Base:        6.30 €                                                        │
│  Distance:    150 × 3.20 = 480.00 €                                         │
│  Trafic:      105 × 0.30 × 0.50 = 15.75 €                                   │
│  ─────────────────────────────────                                          │
│  TOTAL:       502.05 €                                                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 4.2 Algorithme de Dispatch (Chauffeur le Plus Proche)

### Principe

Le système de dispatch attribue automatiquement chaque nouvelle course au chauffeur disponible le plus proche du point de prise en charge.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ALGORITHME DE DISPATCH                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ENTRÉE: Position du client (lat_c, lng_c)                                 │
│                                                                              │
│   ÉTAPES:                                                                   │
│   1. Récupérer tous les chauffeurs avec:                                    │
│      - is_online = true                                                     │
│      - position ≠ null                                                      │
│      - pas de course en cours                                               │
│                                                                              │
│   2. Pour chaque chauffeur:                                                 │
│      - Calculer distance avec formule Haversine                             │
│      - distance = haversine(lat_c, lng_c, lat_ch, lng_ch)                   │
│                                                                              │
│   3. Trier les chauffeurs par distance croissante                           │
│                                                                              │
│   4. Retourner le chauffeur avec distance minimale                          │
│                                                                              │
│   SORTIE: Chauffeur le plus proche ou null si aucun disponible              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Formule de Haversine

La formule de Haversine calcule la distance entre deux points sur une sphère (la Terre) à partir de leurs coordonnées GPS.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      FORMULE DE HAVERSINE                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Données:                                                                  │
│   - Point A: (lat₁, lon₁)  en degrés                                        │
│   - Point B: (lat₂, lon₂)  en degrés                                        │
│   - R = 6371 km (rayon moyen de la Terre)                                   │
│                                                                              │
│   Conversion en radians:                                                    │
│   - φ₁ = lat₁ × π/180                                                       │
│   - φ₂ = lat₂ × π/180                                                       │
│   - Δφ = (lat₂ - lat₁) × π/180                                              │
│   - Δλ = (lon₂ - lon₁) × π/180                                              │
│                                                                              │
│   Formule:                                                                  │
│   ┌────────────────────────────────────────────────────────────────────┐    │
│   │                                                                    │    │
│   │   a = sin²(Δφ/2) + cos(φ₁) × cos(φ₂) × sin²(Δλ/2)                 │    │
│   │                                                                    │    │
│   │   c = 2 × atan2(√a, √(1-a))                                        │    │
│   │                                                                    │    │
│   │   distance = R × c                                                 │    │
│   │                                                                    │    │
│   └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Implémentation Python

```python
from math import radians, cos, sin, asin, sqrt
from typing import Optional, List, Dict

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calcule la distance en kilomètres entre deux points GPS
    en utilisant la formule de Haversine.
    
    Paramètres:
    -----------
    lat1, lon1 : float
        Coordonnées du premier point (en degrés)
    lat2, lon2 : float
        Coordonnées du second point (en degrés)
    
    Retourne:
    ---------
    float : Distance en kilomètres
    
    Exemple:
    --------
    >>> haversine_distance(46.2044, 6.1432, 46.2381, 6.1090)
    4.52  # km entre Gare de Genève et Aéroport
    """
    
    # Rayon de la Terre en kilomètres
    R = 6371.0
    
    # Conversion des degrés en radians
    lat1_rad = radians(lat1)
    lat2_rad = radians(lat2)
    delta_lat = radians(lat2 - lat1)
    delta_lon = radians(lon2 - lon1)
    
    # Formule de Haversine
    a = sin(delta_lat / 2)**2 + cos(lat1_rad) * cos(lat2_rad) * sin(delta_lon / 2)**2
    c = 2 * asin(sqrt(a))
    
    # Distance
    distance = R * c
    
    return round(distance, 2)


async def find_nearest_chauffeur(
    db,
    pickup_lat: float, 
    pickup_lng: float,
    exclude_chauffeur_id: Optional[str] = None
) -> Optional[Dict]:
    """
    Trouve le chauffeur disponible le plus proche d'un point de prise en charge.
    
    Paramètres:
    -----------
    db : Database
        Instance de la base de données MongoDB
    pickup_lat, pickup_lng : float
        Coordonnées du point de prise en charge
    exclude_chauffeur_id : str (optionnel)
        ID d'un chauffeur à exclure (ex: s'il a déjà refusé)
    
    Retourne:
    ---------
    dict ou None : Chauffeur le plus proche avec sa distance, ou None
    
    Algorithme:
    -----------
    1. Query MongoDB pour chauffeurs en ligne
    2. Calcul distance pour chaque chauffeur
    3. Tri par distance croissante
    4. Retour du premier (plus proche)
    """
    
    # 1. Construire le filtre de recherche
    filter_query = {
        "$or": [
            {"is_online": True},
            {"status": "online"}
        ],
        "position": {"$ne": None}
    }
    
    # Exclure un chauffeur si spécifié
    if exclude_chauffeur_id:
        filter_query["id"] = {"$ne": exclude_chauffeur_id}
    
    # 2. Récupérer tous les chauffeurs disponibles
    chauffeurs = await db.chauffeurs.find(
        filter_query,
        {"_id": 0, "hashed_password": 0}  # Exclure données sensibles
    ).to_list(100)
    
    if not chauffeurs:
        return None
    
    # 3. Calculer la distance pour chaque chauffeur
    for chauffeur in chauffeurs:
        position = chauffeur.get("position", {})
        ch_lat = position.get("lat", 0)
        ch_lng = position.get("lng", 0)
        
        chauffeur["distance_km"] = haversine_distance(
            pickup_lat, pickup_lng,
            ch_lat, ch_lng
        )
    
    # 4. Trier par distance croissante
    chauffeurs.sort(key=lambda x: x["distance_km"])
    
    # 5. Retourner le plus proche
    nearest = chauffeurs[0]
    
    return {
        "chauffeur": nearest,
        "distance_km": nearest["distance_km"],
        "eta_minutes": estimate_eta(nearest["distance_km"])
    }


def estimate_eta(distance_km: float, avg_speed_kmh: float = 30) -> int:
    """
    Estime le temps d'arrivée en minutes.
    
    Vitesse moyenne en ville: ~30 km/h
    """
    eta_hours = distance_km / avg_speed_kmh
    eta_minutes = int(eta_hours * 60)
    return max(1, eta_minutes)  # Minimum 1 minute
```

### Visualisation du Dispatch

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      EXEMPLE DE DISPATCH                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                    Carte de Genève                                          │
│                                                                              │
│            🚕 C3                                                             │
│             (4.2 km)                                                        │
│                    ╲                                                        │
│                     ╲                                                       │
│      🚕 C1           ╲                                                      │
│       (1.8 km)        ╲                                                     │
│            ╲           ╲                                                    │
│             ╲           ╲                                                   │
│              ╲           ╲                                                  │
│               ╲           ╲                                                 │
│                📍 CLIENT   ╲                                                │
│                 (Point de   ╲                                               │
│                  pickup)     ╲                                              │
│                              ╲                                              │
│                    🚕 C2      ╲                                             │
│                     (0.8 km) ◄── SÉLECTIONNÉ (plus proche)                  │
│                                                                              │
│                                                                              │
│   Résultat du dispatch:                                                     │
│   ┌─────────────────────────────────────────┐                               │
│   │ Chauffeur sélectionné: C2               │                               │
│   │ Distance: 0.8 km                        │                               │
│   │ ETA: ~2 minutes                         │                               │
│   └─────────────────────────────────────────┘                               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 4.3 Algorithme de Calcul d'Itinéraire

### API Google Directions

```javascript
/**
 * Calcule l'itinéraire entre deux points via Google Directions API
 * 
 * @param {Object} origin - Point de départ {lat, lng}
 * @param {Object} destination - Point d'arrivée {lat, lng}
 * @returns {Object} Informations de route
 */
async function calculateRoute(origin, destination) {
  // 1. Créer une instance du service Directions
  const directionsService = new google.maps.DirectionsService();
  
  // 2. Faire la requête
  const result = await new Promise((resolve, reject) => {
    directionsService.route({
      origin: { lat: origin.lat, lng: origin.lng },
      destination: { lat: destination.lat, lng: destination.lng },
      travelMode: google.maps.TravelMode.DRIVING,
      
      // Options avancées
      provideRouteAlternatives: false,
      optimizeWaypoints: true,
      
      // Préférences de route
      avoidHighways: false,
      avoidTolls: false
      
    }, (response, status) => {
      if (status === 'OK') {
        resolve(response);
      } else {
        reject(new Error(`Directions API error: ${status}`));
      }
    });
  });
  
  // 3. Extraire les informations
  const route = result.routes[0];
  const leg = route.legs[0];
  
  return {
    // Distance et durée
    distance: {
      value: leg.distance.value,        // mètres
      text: leg.distance.text           // "5.8 km"
    },
    duration: {
      value: leg.duration.value,        // secondes
      text: leg.duration.text           // "12 mins"
    },
    
    // Polyline encodée (pour affichage sur carte)
    polyline: route.overview_polyline.points,
    
    // Points décodés pour Leaflet
    decodedPath: decodePolyline(route.overview_polyline.points),
    
    // Heure d'arrivée estimée
    eta: calculateETA(leg.duration.value)
  };
}
```

### Décodage de Polyline

Google encode les chemins avec un algorithme de compression. Voici le décodeur:

```javascript
/**
 * Décode une polyline encodée Google en tableau de coordonnées
 * 
 * Algorithme:
 * - Chaque caractère représente une différence encodée
 * - Les différences sont additionnées pour reconstituer les coordonnées
 * - Les valeurs sont divisées par 1e5 pour obtenir les degrés
 * 
 * @param {string} encoded - Polyline encodée
 * @returns {Array} Tableau de [lat, lng]
 */
function decodePolyline(encoded) {
  const points = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  
  while (index < encoded.length) {
    // Décoder la latitude
    let shift = 0;
    let result = 0;
    let byte;
    
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    
    const deltaLat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += deltaLat;
    
    // Décoder la longitude
    shift = 0;
    result = 0;
    
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    
    const deltaLng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += deltaLng;
    
    // Ajouter le point (conversion en degrés)
    points.push([lat / 1e5, lng / 1e5]);
  }
  
  return points;
}
```

---

# 5. FLUX FONCTIONNELS

## 5.1 Cycle de Vie d'une Course

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CYCLE DE VIE D'UNE COURSE                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                                                                              │
│   ┌───────────┐                                                             │
│   │  CRÉATION │ ─────────────────────────────────────────────────┐          │
│   │           │                                                   │          │
│   │ Client    │                                                   │          │
│   │ commande  │                                                   ▼          │
│   └─────┬─────┘                                            ┌───────────┐    │
│         │                                                  │ ANNULÉE   │    │
│         │                                                  │           │    │
│         ▼                                                  │ Par client│    │
│   ┌───────────┐         Timeout ou                        │ ou timeout│    │
│   │  PENDING  │ ────────refus chauffeur ──────────────────►           │    │
│   │           │                                            └───────────┘    │
│   │ En attente│                                                  ▲          │
│   │ dispatch  │                                                  │          │
│   └─────┬─────┘                                                  │          │
│         │                                                        │          │
│         │ Chauffeur trouvé                                       │          │
│         │ et assigné                                             │          │
│         ▼                                                        │          │
│   ┌───────────┐                                                  │          │
│   │ ASSIGNED  │ ────────────Chauffeur annule ────────────────────┘          │
│   │           │                                                             │
│   │ Chauffeur │                                                             │
│   │ en route  │                                                             │
│   │ vers      │                                                             │
│   │ client    │                                                             │
│   └─────┬─────┘                                                             │
│         │                                                                   │
│         │ Chauffeur arrive                                                  │
│         │ chez le client                                                    │
│         ▼                                                                   │
│   ┌───────────┐                                                             │
│   │IN_PROGRESS│                                                             │
│   │           │                                                             │
│   │ Course en │                                                             │
│   │ cours     │                                                             │
│   │           │                                                             │
│   └─────┬─────┘                                                             │
│         │                                                                   │
│         │ Arrivée à                                                         │
│         │ destination                                                       │
│         ▼                                                                   │
│   ┌───────────┐                                                             │
│   │ COMPLETED │                                                             │
│   │           │                                                             │
│   │ Course    │                                                             │
│   │ terminée  │                                                             │
│   │           │                                                             │
│   │ Paiement  │                                                             │
│   └───────────┘                                                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 5.2 Diagramme de Séquence - Réservation Complète

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SÉQUENCE DE RÉSERVATION                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ CLIENT          FRONTEND         BACKEND         DATABASE        CHAUFFEUR  │
│    │               │                │                │               │      │
│    │ Ouvre app     │                │                │               │      │
│    │──────────────►│                │                │               │      │
│    │               │                │                │               │      │
│    │               │ GET /chauffeurs/actifs         │               │      │
│    │               │───────────────►│                │               │      │
│    │               │                │ Query online   │               │      │
│    │               │                │───────────────►│               │      │
│    │               │                │◄───────────────│               │      │
│    │               │◄───────────────│                │               │      │
│    │               │                │                │               │      │
│    │ Saisit        │                │                │               │      │
│    │ destination   │                │                │               │      │
│    │──────────────►│                │                │               │      │
│    │               │                │                │               │      │
│    │               │ Google Places Autocomplete     │               │      │
│    │               │──────────────────────────────────────►          │      │
│    │               │◄──────────────────────────────────────          │      │
│    │               │                │                │               │      │
│    │               │ POST /course/estimate          │               │      │
│    │               │───────────────►│                │               │      │
│    │               │                │ Calculate fare │               │      │
│    │               │◄───────────────│ {prix: 25.50€}│               │      │
│    │◄──────────────│                │                │               │      │
│    │               │                │                │               │      │
│    │ Confirme      │                │                │               │      │
│    │ commande      │                │                │               │      │
│    │──────────────►│                │                │               │      │
│    │               │ POST /course/create            │               │      │
│    │               │───────────────►│                │               │      │
│    │               │                │                │               │      │
│    │               │                │ 1. Find nearest│               │      │
│    │               │                │───────────────►│               │      │
│    │               │                │◄───────────────│               │      │
│    │               │                │                │               │      │
│    │               │                │ 2. Create course               │      │
│    │               │                │───────────────►│               │      │
│    │               │                │                │               │      │
│    │               │                │ 3. Notify      │               │      │
│    │               │                │────────────────────────────────►│     │
│    │               │                │                │               │      │
│    │               │◄───────────────│                │   Réception   │      │
│    │◄──────────────│ {course_id,   │                │   notification│      │
│    │               │  chauffeur}    │                │◄──────────────│      │
│    │               │                │                │               │      │
│    │               │                │                │   Accepte     │      │
│    │               │                │                │──────────────►│      │
│    │               │                │◄───────────────────────────────│      │
│    │               │                │                │               │      │
│    │               │ Polling: GET /course/{id}      │               │      │
│    │               │───────────────►│                │               │      │
│    │               │◄───────────────│                │               │      │
│    │◄──────────────│ {status:      │                │               │      │
│    │               │  assigned,    │                │               │      │
│    │               │  eta: 5min}   │                │               │      │
│    │               │                │                │               │      │
│    │   ═══════════ SUIVI TEMPS RÉEL ═══════════     │               │      │
│    │               │                │                │               │      │
│    │               │◄─────────────────────────────────────────────────│     │
│    │◄──────────────│ Position GPS mise à jour       │               │      │
│    │               │                │                │               │      │
│    │   ══════════════ FIN COURSE ══════════════     │               │      │
│    │               │                │                │               │      │
│    │               │                │◄───────────────────────────────│      │
│    │               │◄───────────────│ Course         │  Complète     │      │
│    │◄──────────────│ completed      │  course        │  course       │      │
│    │               │ prix_final     │                │               │      │
│    │               │                │                │               │      │
│    ▼               ▼                ▼                ▼               ▼      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 5.3 Flux du Chauffeur

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      FLUX CHAUFFEUR                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                    ┌─────────────────┐                                       │
│                    │    CONNEXION    │                                       │
│                    │   Code + MDP    │                                       │
│                    └────────┬────────┘                                       │
│                             │                                                │
│                             ▼                                                │
│                    ┌─────────────────┐                                       │
│                    │   HORS SERVICE  │◄────────────────────┐                 │
│                    │   (Offline)     │                     │                 │
│                    └────────┬────────┘                     │                 │
│                             │                              │                 │
│                             │ Clic "En service"            │                 │
│                             ▼                              │                 │
│                    ┌─────────────────┐                     │                 │
│              ┌────►│   EN SERVICE    │                     │                 │
│              │     │   (Online)      │─────────────────────┘                 │
│              │     │                 │     Clic "Hors service"               │
│              │     │ • Position GPS  │                                       │
│              │     │   envoyée       │                                       │
│              │     │ • En attente de │                                       │
│              │     │   courses       │                                       │
│              │     └────────┬────────┘                                       │
│              │              │                                                │
│              │              │ Notification nouvelle course                   │
│              │              ▼                                                │
│              │     ┌─────────────────┐                                       │
│              │     │   NOTIFICATION  │                                       │
│              │     │   REÇUE         │                                       │
│              │     │                 │                                       │
│              │     │ 🔔 Sonnerie     │                                       │
│              │     │ • Pickup        │                                       │
│              │     │ • Destination   │                                       │
│              │     │ • Prix estimé   │                                       │
│              │     │ • Distance      │                                       │
│              │     └────────┬────────┘                                       │
│              │              │                                                │
│              │         ┌────┴────┐                                           │
│              │         ▼         ▼                                           │
│              │    ┌────────┐ ┌────────┐                                      │
│              │    │REFUSER │ │ACCEPTER│                                      │
│              │    └───┬────┘ └───┬────┘                                      │
│              │        │          │                                           │
│              └────────┘          ▼                                           │
│                         ┌─────────────────┐                                  │
│                         │  EN ROUTE VERS  │                                  │
│                         │    CLIENT       │                                  │
│                         │                 │                                  │
│                         │ • Navigation GPS│                                  │
│                         │ • ETA affiché   │                                  │
│                         │ • Chrono        │                                  │
│                         └────────┬────────┘                                  │
│                                  │                                           │
│                                  │ Arrivée chez client                       │
│                                  │ Clic "Démarrer course"                    │
│                                  ▼                                           │
│                         ┌─────────────────┐                                  │
│                         │   EN COURSE     │                                  │
│                         │                 │                                  │
│                         │ • Navigation    │                                  │
│                         │   destination   │                                  │
│                         │ • Chrono actif  │                                  │
│                         │ • Prix temps    │                                  │
│                         │   réel          │                                  │
│                         └────────┬────────┘                                  │
│                                  │                                           │
│                                  │ Arrivée destination                       │
│                                  │ Clic "Terminer"                           │
│                                  ▼                                           │
│                         ┌─────────────────┐                                  │
│                         │ COURSE TERMINÉE │                                  │
│                         │                 │                                  │
│                         │ • Prix final    │                                  │
│                         │ • Paiement      │                                  │
│                         │ • Retour "En    │                                  │
│                         │   service"      │                                  │
│                         └─────────────────┘                                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# 6. INTERFACES UTILISATEUR

## 6.1 Interface Client

### Dashboard Principal

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ☰                        🚕 TaxiG                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │                                                                       │  │
│  │                         🗺️ CARTE                                      │  │
│  │                                                                       │  │
│  │                     (OpenStreetMap)                                   │  │
│  │                                                                       │  │
│  │               📍 Position client (bleu)                               │  │
│  │                                                                       │  │
│  │          🚕    🚕         🚕                                          │  │
│  │       Taxis disponibles (jaune)                                       │  │
│  │                                                                       │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ ● Point de départ                                                     │  │
│  │   Rue de la Gare 15, Genève                                          │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                    🔍 OÙ ALLEZ-VOUS ?                                 │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│                         41 chauffeurs disponibles                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Écran de Confirmation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ✕                  Confirmer la course                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ● Rue de la Gare 15, Genève                                                │
│  │                                                                          │
│  │ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─                                           │
│  │                                                                          │
│  ◉ Aéroport International de Genève                                         │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│   🚗 5.8 km                                        ⏱️ ~15 min               │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         Prix estimé                                   │  │
│  │                                                                       │  │
│  │                          28.51€                                       │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│   ┌─────────────────────┐    ┌─────────────────────┐                        │
│   │   💵 ESPÈCES        │    │   💳 CARTE          │                        │
│   │      ✓ Sélectionné  │    │                     │                        │
│   └─────────────────────┘    └─────────────────────┘                        │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                    COMMANDER MAINTENANT                               │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 6.2 Interface Chauffeur

### Dashboard avec Course Active

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ☰                        🚕 TaxiG                                     ⏻    │
├─────────────────────────────────────────────────────────────────────────────┤
│                         ● En service                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         🗺️ CARTE                                      │  │
│  │                                                                       │  │
│  │                  🚕 ════════════ 📍                                   │  │
│  │               Chauffeur       Client                                  │  │
│  │                                                                       │  │
│  │            (Itinéraire en bleu)                                       │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌─────────────────────────────────────┐  ┌─────────────────────────────┐  │
│  │  🕐 12 mins                         │  │  ETA: 14:32                 │  │
│  │     3.2 km                          │  │                             │  │
│  └─────────────────────────────────────┘  └─────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ 🚗 En route vers le client                     ┌───────────┐          │  │
│  │ TG-20260207-ABC123                             │ 03:42     │          │  │
│  │                                                │ Chrono    │          │  │
│  │                                                └───────────┘          │  │
│  ├───────────────────────────────────────────────────────────────────────┤  │
│  │                                                                       │  │
│  │  ● PRISE EN CHARGE                                                   │  │
│  │    Rue de la Gare 15, Genève                                         │  │
│  │    👤 Jean Dupont                                                    │  │
│  │                                                                       │  │
│  │  ◉ DESTINATION                                                       │  │
│  │    Aéroport International de Genève                                  │  │
│  │                                                                       │  │
│  ├───────────────────────────────────────────────────────────────────────┤  │
│  │  Distance: 5.8 km    │    Durée: 15 min    │    ETA: 14:32           │  │
│  ├───────────────────────────────────────────────────────────────────────┤  │
│  │                                                                       │  │
│  │  💰 4.2 km                                           28.51€          │  │
│  │                                                                       │  │
│  ├───────────────────────────────────────────────────────────────────────┤  │
│  │                                                                       │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │              ✓ DÉMARRER LA COURSE                              │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Page Revenus avec Export PDF

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ☰                        🚕 TaxiG                                     ⏻    │
├─────────────────────────────────────────────────────────────────────────────┤
│                         ● En service                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Mes revenus                                         📥 Télécharger PDF     │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ 📄 Export Comptabilité                                      📥 PDF   │  │
│  │    Téléchargez vos revenus en PDF pour votre comptable               │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  Revenus brut (30 jours)                                             │  │
│  │                                                                       │  │
│  │                        1,636.90€                                     │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌──────────────────────────────┐  ┌──────────────────────────────────┐    │
│  │  Net                         │  │  Commission TaxiG                │    │
│  │                              │  │                                  │    │
│  │  1,391.36€                   │  │  -245.53€                        │    │
│  │                              │  │                                  │    │
│  └──────────────────────────────┘  └──────────────────────────────────┘    │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  Nombre de courses                                                   │  │
│  │                              9                                        │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  Dernières courses complétées                                        │  │
│  │                                                                       │  │
│  │  TG-20260207-F033C2          07/02/2026            7.59€             │  │
│  │  TG-20260207-466B11          07/02/2026            1512.32€          │  │
│  │  TG-20260207-A718E6          07/02/2026            21.30€            │  │
│  │  ...                                                                  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 6.3 Interface Administration

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ☰                   Tableau de bord                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐  ┌────────────┐│
│  │  🚕 Chauffeurs │  │  👥 Clients    │  │  📋 Courses    │  │ 💰 Revenus ││
│  │                │  │                │  │                │  │            ││
│  │      41        │  │       2        │  │      11        │  │ 1,636.90€  ││
│  │   41 en ligne  │  │                │  │  9 terminées   │  │ +245.53€   ││
│  │                │  │                │  │                │  │ commission ││
│  └────────────────┘  └────────────────┘  └────────────────┘  └────────────┘│
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  ⏰ Activité récente des chauffeurs                                   │  │
│  │                                                                       │  │
│  │  ● Mohamed Ahmed           A commencé le service        7 févr. 01:37│  │
│  │  ○ Mohamed Ahmed           A terminé le service         7 févr. 01:36│  │
│  │  ● Mohamed Ahmed           A commencé le service        7 févr. 01:33│  │
│  │  ○ Mohamed Ahmed           A terminé le service         7 févr. 01:33│  │
│  │  ● Mohamed Ahmed           A commencé le service        7 févr. 01:30│  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# 7. API REST COMPLÈTE

## 7.1 Endpoints d'Authentification

### Client

| Méthode | Endpoint | Description | Corps de la requête | Réponse |
|---------|----------|-------------|---------------------|---------|
| POST | `/api/client/register` | Inscription | `{email, password, prenom, nom, telephone}` | `{id, email, prenom, nom}` |
| POST | `/api/client/login` | Connexion | `{email, password}` | `{access_token, token_type}` |
| GET | `/api/client/profile` | Profil | - | `{id, email, prenom, nom, ...}` |
| GET | `/api/client/history` | Historique courses | - | `[{course}, ...]` |

### Chauffeur

| Méthode | Endpoint | Description | Corps | Réponse |
|---------|----------|-------------|-------|---------|
| POST | `/api/chauffeur/login` | Connexion | `{code_chauffeur, password}` | `{access_token}` |
| GET | `/api/chauffeur/profile` | Profil | - | `{id, code, prenom, ...}` |
| POST | `/api/chauffeur/status` | Changer statut | `{is_online: bool}` | `{status}` |
| POST | `/api/chauffeur/position` | MAJ position | `{latitude, longitude}` | `{ok}` |

### Admin

| Méthode | Endpoint | Description | Corps | Réponse |
|---------|----------|-------------|-------|---------|
| POST | `/api/admin/login` | Connexion | `{username, password}` | `{access_token}` |
| GET | `/api/admin/stats` | Statistiques | - | `{chauffeurs, clients, courses, revenus}` |

## 7.2 Endpoints Courses

| Méthode | Endpoint | Description | Corps | Réponse |
|---------|----------|-------------|-------|---------|
| POST | `/api/course/estimate` | Estimation prix | `{pickup_*, destination_*, distance_km, duration_minutes}` | `{prix estimé, détails}` |
| POST | `/api/course/create` | Créer course | `{pickup_*, destination_*, payment_method}` | `{course_id, chauffeur}` |
| GET | `/api/course/{id}` | Détails | - | `{course complète}` |
| POST | `/api/course/{id}/cancel` | Annuler | - | `{status}` |

## 7.3 Endpoints Chauffeur (Gestion courses)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/chauffeur/pending-course` | Course en attente |
| POST | `/api/chauffeur/course/{id}/respond` | Accepter/Refuser |
| POST | `/api/chauffeur/course/{id}/start` | Démarrer |
| POST | `/api/chauffeur/course/{id}/complete` | Terminer |
| GET | `/api/chauffeur/revenus` | Statistiques revenus |
| GET | `/api/chauffeur/commandes` | Liste des courses |

---

# 8. SÉCURITÉ

## 8.1 Authentification JWT

```python
# Création du token
from jose import jwt
from datetime import datetime, timedelta

def create_access_token(data: dict, expires_delta: timedelta = timedelta(hours=24)):
    to_encode = data.copy()
    expire = datetime.utcnow() + expires_delta
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm="HS256")
    return encoded_jwt

# Vérification
def verify_token(token: str):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Token invalide")
```

## 8.2 Hashage des Mots de Passe (Bcrypt)

```python
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Hashage
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

# Vérification
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)
```

---

# 9. CONFIGURATION

## 9.1 Variables d'Environnement

### Backend (.env)

```bash
# MongoDB
MONGO_URL="mongodb+srv://user:pass@cluster.mongodb.net/db"
DB_NAME="taxi"

# JWT
JWT_SECRET="votre_secret_super_securise_256bits"

# Stripe (Paiements)
STRIPE_API_KEY="sk_live_..."
STRIPE_PUBLIC_KEY="pk_live_..."

# Google Maps
GOOGLE_MAPS_API_KEY="AIzaSy..."

# CORS
CORS_ORIGINS="*"
```

### Frontend (.env)

```bash
REACT_APP_BACKEND_URL="https://taxig-redesign.preview.emergentagent.com"
REACT_APP_GOOGLE_MAPS_API_KEY="AIzaSy..."
```

---

# 10. TESTS ET VALIDATION

## 10.1 Identifiants de Test

| Rôle | Identifiant | Mot de passe |
|------|-------------|--------------|
| Client | jean.dupont@test.com | test123 |
| Chauffeur Principal | TAXI001 | chauffeur123 |
| Chauffeurs Genève | GVA001 à GVA040 | test123 |
| Admin | naim | admin123 |

## 10.2 Scénarios de Test

1. **Inscription Client** → Connexion → Réservation
2. **Connexion Chauffeur** → Mise en service → Réception course → Acceptation → Navigation → Fin de course
3. **Admin** → Statistiques → Gestion chauffeurs

---

# ANNEXES

## A. Glossaire

| Terme | Définition |
|-------|------------|
| Dispatch | Processus d'attribution d'une course à un chauffeur |
| ETA | Estimated Time of Arrival - Heure d'arrivée estimée |
| Haversine | Formule mathématique pour calculer la distance sur une sphère |
| JWT | JSON Web Token - Standard pour l'authentification |
| Polyline | Ligne encodée représentant un itinéraire |
| Polling | Requêtes répétées pour obtenir des mises à jour |

## B. Contact

- **Application**: TaxiG
- **Version**: 1.0.0
- **Date**: Février 2026
- **URL**: https://taxig-redesign.preview.emergentagent.com

---

*Document généré automatiquement - TaxiG Platform*
*© 2026 TaxiG - Tous droits réservés*
