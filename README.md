# Rendezvous

Find the fairest place to meet. Rendezvous calculates the best possible meeting point based on location and preferences for the best points to connect.

## Tech Stack

- **Frontend**: Next.js (App Router), React, Tailwind CSS v4, Lucide React
- **Maps & Geolocation**: Mapbox GL JS (`mapbox-gl`), Mapbox Search Box API, Mapbox Directions API, Targomo API (for transit isochrones)
- **Backend**: Next.js API Routes, Node.js
- **Database**: MongoDB (via Mongoose)
- **Authentication**: JWT, bcrypt

## Key Features

- **Admin Location Search**: Interactive search box using the Mapbox Search Box API with suggestion listing and full details retrieval. Uses session token grouping and debouncing to keep API consumption well within the Mapbox free tier.
- **Admin Lobby Overview Map**: Before voting begins, the admin sees a persistent Mapbox map showing all participants' geocoded positions (pulsing dots) and all added/auto-generated venue markers with color-coded legends. The map preserves pan/zoom state across live polling updates.
- **Smart Auto-Generation**: Venue auto-generation only triggers when the admin explicitly opts-in and clicks "Start Voting". To prevent abuse and confusion, it is limited to a single generation per room, while admin-added locations are always preserved.
- **Hybrid Transit Routing Architecture**: Provides pixel-perfect multi-modal routes anywhere in the world using a robust 4-tier fallback system: TfNSW (for Sydney) -> HERE Transit API (Global shapes) -> Targomo (Desire lines) -> Mapbox Directions (Driving fallback).
- **Persistent Interactive Map**: Persistently shows proposed venues and user location. Clicking location cards or pins draws the active road route path dynamically.
- **Real-Time GPS Tracking**: Places a pulsing blue dot representing the user's current GPS location on the voting map, automatically fitting bounds to show all candidates relative to the user.
- **Interactive Drag-and-Drop Voting**: Rank options dynamically by dragging candidate cards in real time before submitting votes.

## Setup Instructions

### 1. Prerequisites

- [Node.js](https://nodejs.org/en/) (v18 or higher recommended)
- [MongoDB Community Edition](https://www.mongodb.com/try/download/community) installed and running locally.

### 2. Install MongoDB (Local Setup)

Please follow the official [MongoDB Community Edition Installation Guide](https://www.mongodb.com/docs/manual/administration/install-community/) for complete instructions on how to install and start the MongoDB service on your machine.

### 3. Environment Variables

Create a `.env` file in the root directory of your project and set the following environment variables:

```env
MONGODB_URI='mongodb://localhost:27017/rendezvous'
JWT_SECRET='random string'
JWT_NAME='rendezvous_auth'
NEXT_PUBLIC_BASE_URL='http://localhost:3000'
NEXT_PUBLIC_MAPBOX_TOKEN='your_mapbox_public_token_here'
MAPBOX_SECRET_TOKEN='your_mapbox_secret_token_here'
TFNSW_API_KEY='your_tfnsw_api_key_here'
HERE_API_KEY='your_here_api_key_here'
TARGOMO_API_KEY='your_targomo_api_key_here'
```

_(Note: Be sure to change `JWT_SECRET` to a secure, random string in production!)_

**Important Note on Mapbox Tokens:**
For security, create **two** tokens in Mapbox:
1. `NEXT_PUBLIC_MAPBOX_TOKEN`: Add URL restrictions to this token in Mapbox so it can only be used on your domain.
2. `MAPBOX_SECRET_TOKEN`: Do not add URL restrictions. This is kept completely hidden on the server to make backend API calls.

### 4. Getting a Transport for NSW (TfNSW) API Key

The public transit routing features query the official **TfNSW Trip Planner API**. To obtain your free API Key:
1. Register/Login at the [TfNSW Open Data Hub](https://opendata.transport.nsw.gov.au/).
2. Navigate to **My Applications** and click **Create New Application**.
3. Add/enable the **Public Transport Trip Planner API** subscription to your application.
4. Retrieve your generated key from the application dashboard.
5. Set `TFNSW_API_KEY` in your `.env` file to this key. 

*(Note: Because TfNSW is a state-level agency, true public transit routing and map-drawn transit lines will only work for locations within New South Wales, Australia. If you use the app outside of NSW, or if the key is missing/invalid, the app will gracefully fall back to the **HERE Transit API** to draw accurate global transit lines. If that fails, it falls back to **Targomo** for straight desire-lines).*

### 5. Getting a HERE API Key (Global Transit Routing)

The routing engine uses **HERE Technologies** as a robust global fallback for drawing curved transit paths outside of Sydney.
1. Register for a free account at the [HERE Developer Portal](https://developer.here.com/).
2. Generate a new REST API Key.
3. Open your `.env` file and set `HERE_API_KEY='your_key_here'`.

*(If this key is missing, the algorithm falls back to Targomo).*

### 6. Getting a Targomo API Key (Transit Isochrones)

The algorithm uses **Targomo** to draw accurate transit boundary polygons to find meeting spots.
1. Register for a free account at [Targomo](https://www.targomo.com/).
2. Navigate to your Targomo Dashboard and go to the **API Keys** section.
3. Generate a new API Key.
4. Open your `.env` file and set `TARGOMO_API_KEY='your_key_here'`.

*(If this key is missing, the algorithm gracefully falls back to a Mapbox cycling heuristic).*

### 7. Install Dependencies & Run

Install the node modules:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the application!

### 8. API Documentation

This project provides an interactive Swagger UI to easily explore and test the backend API endpoints.

To access the documentation:
1. Ensure the development server is running (`npm run dev`).
2. Navigate to [http://localhost:3000/api-docs](http://localhost:3000/api-docs) in your browser.
3. You can also view or lint the raw OpenAPI 3.0 specification file directly at `public/swagger.yaml`.

## TODOs & Future Work

### Algorithm Limitations

While the algorithm uses a highly robust Dual-Proximity search to avoid geographical pitfalls, it still has a few known limitations to be improved in the future:

- [ ] **Transit Transfer Penalty**: The TfNSW routing matrix evaluates strict time duration (minutes) but doesn't penalise the *number of transfers*. A 40-minute commute with 0 transfers will currently lose to a 35-minute commute with 3 bus transfers.
- [ ] **Mapbox POI Quality ("Ghost Venues")**: The Mapbox Search API occasionally returns outdated venues (permanently closed businesses) or administrative locations tagged incorrectly (e.g. an office staff cafeteria tagged as a public cafe). Integrating Google Places or Yelp API would improve POI quality.
- [ ] **Mixed-Mode ("Park & Ride") Support**: The algorithm assumes participants use a single mode (either strictly driving or strictly transit). It cannot calculate commutes where a user drives to a station and takes an express train to the destination.
- [ ] **API Slice Limits**: To prevent rate limits, the algorithm only feeds a maximum of 30 candidate venues into the TfNSW/Mapbox travel-time matrix. It is mathematically possible that the 31st venue could have scored slightly better, but is dropped to save API calls.

### Algorithm Enhancements

- [ ] **Asymmetric Tolerance Thresholds**: Account for varying individual travel willingness. Instead of aiming for a strictly equal travel time for everyone, the algorithm can optimize "fairness" relative to each user's maximum acceptable travel time (e.g., User A is willing to travel 90 mins, User B only 30 mins).
- [ ] **Weighted Preferences**: Allow users to weight their preferences (e.g., "Must have Wi-Fi" vs "Nice to have Wi-Fi") to provide more granular scoring for auto-generated venues.
- [ ] **Time-of-Day Traffic Predictions**: Incorporate predictive traffic models to adjust travel time estimates based on the specific planned time of the meeting, rather than just current traffic.
- [ ] **Cost-Aware Routing**: Factor in toll roads, parking costs, or public transit fares into the "fairness" score to equalize financial burden alongside travel time.
- [ ] **Multi-Destination Itinerary**: Extend the algorithm to not just find a single meeting spot, but to sequence multiple locations (e.g. dinner then drinks) for an optimal group route.
- [ ] **Micro-Mobility Integration**: Factor in e-scooters and shared bikes (Lime, Bird, etc.) as valid last-mile connection options when calculating transit times and isochrone boundaries.
- [ ] **Accessibility (Step-Free) Routing**: Provide strict filters to query transit APIs for step-free routes and wheelchair-friendly stations, adjusting the fairness score accordingly.
- [ ] **Carbon-Efficient Routing**: Calculate the CO2 emissions of different routes and introduce a "green" bias to promote environmentally friendly meeting spots.

### Application Enhancements

- [ ] **User Accounts & History**: Implement user authentication to save favorite locations, past meeting spots, and frequent contacts.
- [ ] **Real-Time WebSockets**: Transition from polling to WebSockets for instant, real-time updates during the live voting phase and lobby interactions.
- [ ] **Calendar Integration**: Allow syncing with Google Calendar or Outlook to automatically suggest meeting times alongside meeting places.
- [ ] **Accessibility (a11y) Improvements**: Enhance the drag-and-drop voting interface and color-coded map legends for screen readers and keyboard-only navigation.
- [ ] **Native Mobile Application**: Port the web app to a native mobile application (e.g., React Native) for deep OS integration, rich push notifications, and background location services.
- [ ] **Guest List & RSVP Tracking**: Allow admins to send formal invites via email/SMS, track RSVPs, and automatically drop users who decline from the algorithm's calculations.
- [ ] **One-Click Export**: Once a venue is finalized, generate one-click "Add to Calendar" (.ics) and "Open in Google/Apple Maps" deep links for all participants.
- [ ] **Lobby Group Chat**: Provide a mini chat window in the voting lobby for participants to discuss the venue options in real-time.
- [ ] **Internationalization (i18n)**: Translate the application into multiple languages and format dates, times, and distances (Metric vs Imperial) according to local user conventions.
