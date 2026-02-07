# TaxiG - Application de Taxi

## Problem Statement
Application de taxi style Uber avec 3 parties : Client, Chauffeur, Admin. Géolocalisation temps réel, tarification dynamique, paiements Stripe/Cash, système de notifications.

## Architecture
- **Backend**: FastAPI + MongoDB (cloud cluster)
- **Frontend**: React + Leaflet Maps
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
- [x] Dashboard Client avec carte Leaflet
- [x] Google Maps Autocomplete pour destinations
- [x] Dashboard Chauffeur avec appel entrant style téléphone
- [x] Dashboard Admin complet avec stats
- [x] Design noir/jaune professionnel

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

## Next Tasks (P0/P1)
- P0: Test complet flow paiement Stripe
- P1: Notifications push navigateur
- P1: Historique rapports chauffeurs
- P2: Export CSV revenus admin
- P2: Mode sombre/clair toggle
