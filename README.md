# Rendezvous

Find the fairest place to meet. Rendezvous calculates the best possible meeting point based on location and preferences for the best points to connect.

## Tech Stack

- **Frontend**: Next.js (App Router), React, Tailwind CSS v4, Lucide React
- **Maps & Geolocation**: Mapbox GL JS (`mapbox-gl`), Mapbox Search Box API, Mapbox Directions API
- **Backend**: Next.js API Routes, Node.js
- **Database**: MongoDB (via Mongoose)
- **Authentication**: JWT, bcrypt

## Key Features

- **Admin Location Search**: Interactive search box using the Mapbox Search Box API with suggestion listing and full details retrieval. Uses session token grouping and debouncing to keep API consumption well within the Mapbox free tier.
- **Multi-Modal Street Routing**: Uses the Mapbox Directions API to fetch street-level travel distances and times for participants. Supported profiles: driving, walking, cycling, and public transit (via a road network proxy).
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
TFNSW_API_KEY='your_tfnsw_api_key_here'
```

_(Note: Be sure to change `JWT_SECRET` to a secure, random string in production!)_

### 4. Getting a Transport for NSW (TfNSW) API Key

The public transit routing features query the official **TfNSW Trip Planner API**. To obtain your free API Key:
1. Register/Login at the [TfNSW Open Data Hub](https://opendata.transport.nsw.gov.au/).
2. Navigate to **My Applications** and click **Create New Application**.
3. Add/enable the **Public Transport Trip Planner API** subscription to your application.
4. Retrieve your generated key from the application dashboard.
5. Set `TFNSW_API_KEY` in your `.env` file to this key. 

*(If this key is missing or invalid, the app will gracefully fall back to road-driving routes via Mapbox Directions).*

### 5. Install Dependencies & Run

Install the node modules:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the application!

### 6. API Documentation

This project provides an interactive Swagger UI to easily explore and test the backend API endpoints.

To access the documentation:
1. Ensure the development server is running (`npm run dev`).
2. Navigate to [http://localhost:3000/api-docs](http://localhost:3000/api-docs) in your browser.
3. You can also view or lint the raw OpenAPI 3.0 specification file directly at `public/swagger.yaml`.

## TODOs / Known Algorithm Limitations

While the algorithm uses a highly robust Dual-Proximity search to avoid geographical pitfalls, it still has a few known limitations to be improved in the future:

- [ ] **Transit Catchment Accuracy**: The Mapbox `cycling` profile is used to approximate transit isochrones (catchment areas), generating a radial boundary. Real-world transit is "star-shaped" (following corridors), meaning the initial search boundary might slightly overestimate or underestimate transit reachability.
- [ ] **Transit Transfer Penalty**: The TfNSW routing matrix evaluates strict time duration (minutes) but doesn't penalise the *number of transfers*. A 40-minute commute with 0 transfers will currently lose to a 35-minute commute with 3 bus transfers.
- [ ] **Mapbox POI Quality ("Ghost Venues")**: The Mapbox Search API occasionally returns outdated venues (permanently closed businesses) or administrative locations tagged incorrectly (e.g. an office staff cafeteria tagged as a public cafe). Integrating Google Places or Yelp API would improve POI quality.
- [ ] **Mixed-Mode ("Park & Ride") Support**: The algorithm assumes participants use a single mode (either strictly driving or strictly transit). It cannot calculate commutes where a user drives to a station and takes an express train to the destination.
- [ ] **API Slice Limits**: To prevent rate limits, the algorithm only feeds a maximum of 30 candidate venues into the TfNSW/Mapbox travel-time matrix. It is mathematically possible that the 31st venue could have scored slightly better, but is dropped to save API calls.
