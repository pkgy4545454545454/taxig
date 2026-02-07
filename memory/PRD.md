# TaxiG - Application de Taxi

## Problem Statement
Application de taxi style Uber avec 3 parties : Client, Chauffeur, Admin. Géolocalisation temps réel, tarification dynamique, paiements Stripe/Cash, système de notifications.

## Architecture
- **Backend**: FastAPI + MongoDB (cloud cluster)
- **Frontend**: React + Leaflet Maps + Google Maps API
- **Auth**: JWT tokens
- **Payments**: Stripe integration

## Core Requirements
- Géolocalisation temps réel des chauffeurs
- Tarification: Base 6.30€ + 3.20€/km + 0.50€/min feux + 0.70€/min attente client
- 3 dashboards: Client, Chauffeur, Admin
- Système d'appel entrant pour chauffeurs (accepter/refuser)
- Jeu roulette promo quotidien (1/20 chance)
- Pointage chauffeurs avec logs temps réel

## Implemented Features (7 Feb 2026)
### Backend
- [x] Auth JWT (Client, Chauffeur, Admin)
- [x] CRUD Chauffeurs via Admin
- [x] Booking system avec dispatch au chauffeur le plus proche
- [x] Calcul tarif dynamique
- [x] Système de pointage
- [x] Roulette promo
- [x] Stripe payment integration

### Frontend
- [x] Landing page avec logo TaxiG
- [x] Dashboard Client avec carte Leaflet couleur
- [x] Google Maps Autocomplete pour destinations
- [x] Dashboard Chauffeur avec appel entrant style téléphone
- [x] Dashboard Admin complet avec stats
- [x] Design noir/jaune professionnel
- [x] **CORRIGÉ** Calcul distance avec Google Directions API
- [x] **CORRIGÉ** Centrage carte style Uber (fitBounds)
- [x] **CORRIGÉ** Itinéraire coloré visible sur carte chauffeur

## Bug Fixes (7 Feb 2026)
- ✅ **Bug 1**: Calcul prix incorrect - Corrigé dans `handleDestinationSet()` pour utiliser Google Directions API
- ✅ **Bug 2**: Zoom/centrage horrible - Corrigé `MapController` avec `fitBounds()` dynamique
- ✅ **Bug 3**: Itinéraire non visible - Corrigé `decodePolyline()` pour extraire `.points`

## Collections MongoDB
- clients, client_commandes
- chauffeurs, chauffeur_commandes, chauffeur_revenus, chauffeur_rapports
- admins, pointages, course_requests, payment_transactions

## User Personas
1. **Client**: Commande taxi, suit en temps réel, paie cash/carte
2. **Chauffeur**: Reçoit appels, pointe début/fin service, gère indisponibilités
3. **Admin**: Gère chauffeurs/clients, voit revenus, envoie rapports

## APIs
- Google Maps API: Autocomplete, Directions, Geocoding
- Stripe: Paiements carte

## Test Credentials
- **Client**: jean.dupont@test.com / test123
- **Chauffeur**: TAXI001 / chauffeur123
- **Admin**: naim / admin123

## Next Tasks (P0/P1)
- P0: Test complet flow paiement Stripe
- P1: Notifications push navigateur pour chauffeurs
- P1: Historique rapports chauffeurs
- P2: Export CSV revenus admin
- P2: Mode sombre/clair toggle
- P2: Système notation 5 étoiles
- P3: Upload documents chauffeur (permis)
