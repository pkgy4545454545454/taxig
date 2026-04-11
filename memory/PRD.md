# TaxiG - Product Requirements Document

## Original Problem Statement
Build a complete taxi application called "TaxiG" with three-sided platform for clients, drivers, and administrator.

## Core Requirements
- **Client App:** Registration/login, map view, pickup/destination inputs, price estimation, booking, ride tracking, history
- **Driver App:** Login with code, online/offline status, real-time requests, accept/reject, route map, revenue export PDF
- **Admin Dashboard:** Platform statistics, driver/client management, ride monitoring
- **Design:** "Bleu marine + Orange (EasyJet)" visual theme

## Tech Stack
- Frontend: React + Tailwind CSS + Shadcn/UI + Leaflet (OpenStreetMap)
- Backend: FastAPI + MongoDB (Motor) + JWT Auth
- Maps: OpenStreetMap (Nominatim geocoding, OSRM routing) - NO Google Maps
- Payments: Stripe (currently broken/expired key)

## User Personas
1. **Client** - Books rides, tracks drivers, views history
2. **Chauffeur (Driver)** - Goes online, receives ride requests, navigates, earns revenue
3. **Admin** - Manages platform, views stats, manages drivers/clients

## What's Been Implemented (Completed)
- Full 3-dashboard application (Client, Driver, Admin)
- JWT authentication for all user types
- OpenStreetMap integration (Nominatim + OSRM + Leaflet)
- Ride booking flow (estimate, book, assign, accept, start, complete)
- Driver revenue tracking + PDF export
- Roulette promo system for clients
- Driver calendar/availability management
- Admin stats, driver/client management, course monitoring
- "Bleu Marine + Orange" theme applied to ALL pages (including ChauffeurDashboard)
- Fixed driver notification polling (stable 3s interval using useRef)
- Fixed dual-database bug (taxi vs taxig)
- Removed Google Maps, PostHog, debug logs

## Credentials
- Client: jean.dupont@test.com / test123
- Driver: TAXI001 / chauffeur123 (Jean Martin)
- Admin: naim / admin123

## Prioritized Backlog
### P1 - Next Tasks
- Stripe payment integration (needs valid API key)
- Browser push notifications for drivers

### P2 - Future Tasks
- 5-star rating system (client/driver)
- Driver document image upload
- File refactoring (large dashboard components >1000 lines)
