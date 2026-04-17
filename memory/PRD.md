# TaxiG - Product Requirements Document

## Original Problem Statement
Build a complete taxi application called "TaxiG" with three-sided platform for clients, drivers, and administrator.

## Core Requirements
- **Client App:** Registration/login, map view, pickup/destination inputs, price estimation, booking, ride tracking, history, rating, real-time chat with driver
- **Driver App:** Login with code, online/offline status, real-time requests with browser notifications, accept/reject, route map, revenue export PDF, document upload, rating, real-time chat with client
- **Admin Dashboard:** Platform statistics, driver/client management, ride monitoring, document verification
- **Design:** "Bleu marine + Orange (EasyJet)" visual theme

## Tech Stack
- Frontend: React + Tailwind CSS + Shadcn/UI + Leaflet (OpenStreetMap)
- Backend: FastAPI + MongoDB (Motor) + JWT Auth
- Maps: OpenStreetMap (Nominatim geocoding, OSRM routing) - NO Google Maps

## What's Been Implemented

### Phase 1 - Core Platform (Complete)
- Full 3-dashboard application (Client, Driver, Admin)
- JWT authentication for all user types
- OpenStreetMap integration (Nominatim + OSRM + Leaflet)
- Ride booking flow (estimate, book, assign, accept, start, complete)
- Driver revenue tracking + PDF export
- Roulette promo system for clients
- Driver calendar/availability management
- Admin stats, driver/client management, course monitoring

### Phase 2 - UI Redesign (Complete)
- "Bleu Marine + Orange" theme applied to ALL pages
- Removed Google Maps, PostHog, debug logs

### Phase 3 - Real-time & New Features (Complete - Apr 2026)
- Fixed driver notification polling (stable 3s interval using useRef)
- Browser push notifications (Web Notifications API) for drivers
- 5-star rating system (client rates driver, driver rates client)
- Document upload for drivers (permis de conduire, permis de séjour, pièce d'identité)
- Admin document verification (approve/reject)

### Phase 4 - Real-time Chat (Complete - Apr 2026)
- Bidirectional chat between client and driver during active rides
- 2-second polling for real-time message updates
- Unread message badge counter with 3s polling
- Sound notification for new messages
- Fullscreen chat panel with Navy+Orange theme
- Reusable ChatPanel component (used in both ClientCourse and ChauffeurDashboard)
- Backend: chat_messages collection with read/unread tracking

## Credentials
- Client: jean.dupont@test.com / test123
- Driver: TAXI001 / chauffeur123 (Jean Martin)
- Driver: TEST002-004 / test123
- Admin: naim / admin123

## Prioritized Backlog
### P1 - Next Tasks
- Stripe payment integration (needs valid API key)

### P2 - Future Tasks
- File refactoring (large dashboard components >1000 lines)
- Service Worker for offline push notifications
- WebSocket upgrade for chat (replace polling)
