# MeetPoint: Iteration Plan & Tickets

**Tech Stack:** React + Node/Express + MongoDB + Socket.IO  
**Total Iterations:** 3

---

## Iteration Overview

| Iteration | Theme | Goal |
|-----------|-------|------|
| 1 | Static Demo | Showcase the end-to-end flow with hardcoded location data. No real algorithm, no live tracking. Prove the concept works. |
| 2 | Live Algorithm & Real-Time Voting | Replace static data with Google Maps/Places API integration. Implement the location recommendation algorithm and real-time WebSocket voting. |
| 3 | Location Tracking, Solo Mode & Polish | Add live location tracking for event day, solo room mode, room reuse, and overall UX polish. |

---

## Iteration 1: Static Demo

**Goal:** A working prototype that demonstrates the full user flow from account creation to winner announcement, using hardcoded location data instead of a real algorithm. This is your demo build.

### Core Features
- User authentication (register/login)
- Room creation with shareable code/link
- Join room flow (logged-in users and guests)
- Participant list with preferences visible to admin
- Admin selects categories and triggers "algorithm" (returns static locations)
- Admin can manually add a location (text input, no Google Maps API yet)
- Voting UI with ranked preference submission
- Admin closes voting manually
- Winner announcement with Google Maps link
- Basic responsive UI

### Tickets

#### Authentication & User Management

**ITER1-001: User Registration**  
*Priority: High | Estimate: 5 pts*  
**Description:** Implement user registration with email and password.  
**Acceptance Criteria:**
- User can register with name, email, and password
- Password is hashed before storage (bcrypt)
- Duplicate email returns a clear error
- JWT token issued on successful registration
- MongoDB User model: `{ name, email, passwordHash, createdAt }`

**ITER1-002: User Login**  
*Priority: High | Estimate: 3 pts*  
**Acceptance Criteria:**
- User can log in with email and password
- JWT token issued on success
- Invalid credentials return a clear error
- Token stored client-side (httpOnly cookie or localStorage with appropriate security)

**ITER1-003: Auth Middleware & Protected Routes**  
*Priority: High | Estimate: 3 pts*  
**Acceptance Criteria:**
- Express middleware validates JWT on protected routes
- Unauthorized requests return 401
- User object attached to `req.user` for downstream handlers

**ITER1-004: Basic Auth UI (Register/Login Pages)**  
*Priority: High | Estimate: 5 pts*  
**Acceptance Criteria:**
- Register page with form validation (email format, password length)
- Login page with error messaging
- Redirect to home/dashboard on success
- Navigation shows logged-in state (user name, logout button)

---

#### Room Management

**ITER1-005: Create Room (Backend)**  
*Priority: High | Estimate: 5 pts*  
**Description:** Logged-in user can create a room. The system generates a unique room code and a shareable link.  
**Acceptance Criteria:**
- POST `/api/rooms` creates a new room
- Room model: `{ code, adminUserId, participants[], status (waiting/voting/completed), categories[], locations[], createdAt }`
- 6-character alphanumeric room code generated (unique)
- Shareable link format: `{baseUrl}/join/{code}`
- Creator is automatically added as a participant and flagged as admin

**ITER1-006: Join Room (Backend)**  
*Priority: High | Estimate: 5 pts*  
**Description:** Both logged-in and guest users can join a room via code or link.  
**Acceptance Criteria:**
- POST `/api/rooms/:code/join` adds a participant
- Participant model (embedded or referenced): `{ userId (nullable for guests), name, location (suburb string), dietaryRequirements, preferences (string), transportationMode, isGuest, isAdmin }`
- Guest users provide a name; logged-in users pull name from their account
- Cannot join a room that is already in voting or completed status
- Cannot join the same room twice (checked by userId or guest name)

**ITER1-007: Create Room UI**  
*Priority: High | Estimate: 3 pts*  
**Acceptance Criteria:**
- Button on dashboard to "Create Room"
- After creation, display the room code and a copyable link
- Redirect to the room lobby view

**ITER1-008: Join Room UI**  
*Priority: High | Estimate: 5 pts*  
**Acceptance Criteria:**
- Join page accessible via `/join/:code` or by entering a code manually
- Form fields: Name (pre-filled for logged-in users), Location (suburb text input), Dietary Requirements (multi-select or free text), Preferences (text area), Transportation Mode (dropdown: driving, transit, walking, cycling)
- "Use current location" button (stores suburb name via browser geolocation + reverse geocode; in Iteration 1, just store raw lat/lng or a placeholder suburb)
- Validation: name and location are required
- On success, redirect to room lobby

**ITER1-009: Room Lobby View**  
*Priority: High | Estimate: 5 pts*  
**Description:** The waiting room where participants gather before voting.  
**Acceptance Criteria:**
- Displays room code and shareable link
- Shows list of joined participants with their name, location, and transportation mode
- Admin sees a "Start" section with category selection
- Non-admin users see a "Waiting for admin to start" message
- Auto-updates when new participants join (polling in Iter 1 is fine; WebSocket in Iter 2)

**ITER1-010: User Dashboard / Home Page**  
*Priority: Medium | Estimate: 3 pts*  
**Acceptance Criteria:**
- Logged-in users see a list of their rooms (active and past)
- Each room card shows: code, status, number of participants, creation date
- Click to re-enter the room lobby/results

---

#### Category Selection & Static Location Algorithm

**ITER1-011: Admin Category Selection**  
*Priority: High | Estimate: 3 pts*  
**Acceptance Criteria:**
- Admin can select one or more categories from a predefined list (e.g., Restaurants, Cafes, Libraries, Parks, Bars)
- Categories stored on the room document
- Categories are locked once the admin triggers the algorithm

**ITER1-012: Static Location "Algorithm"**  
*Priority: High | Estimate: 5 pts*  
**Description:** Instead of a real algorithm, return up to 5 hardcoded locations based on the selected categories. This proves the flow works without needing API keys or algorithm logic.  
**Acceptance Criteria:**
- Backend endpoint: POST `/api/rooms/:code/generate-locations`
- Returns 5 static locations (hardcoded in a seed file or constant) matching the selected categories
- Each location object: `{ name, address, category, lat, lng, googleMapsUrl }`
- Locations stored on the room document
- Room status transitions from `waiting` to `voting`

**ITER1-013: Admin Add Custom Location**  
*Priority: Medium | Estimate: 3 pts*  
**Description:** Admin can manually add a location. In Iteration 1, this is a simple text input (no Google Places autocomplete yet).  
**Acceptance Criteria:**
- Admin can type a location name and address
- Location is added to the room's location list
- Marked with a flag `{ addedByAdmin: true }`
- Limited to 3 custom additions

---

#### Voting

**ITER1-014: Voting UI**  
*Priority: High | Estimate: 8 pts*  
**Description:** Participants rank the suggested locations by preference.  
**Acceptance Criteria:**
- Each participant sees the list of locations (algorithm-generated + admin-added)
- Each location card shows: name, address, category, Google Maps link
- User ranks locations by first preference (drag-and-drop or numbered selection)
- Submit button sends the ranked list to the backend
- User cannot vote twice (enforced backend; UI disables after submission)
- Admin can also vote

**ITER1-015: Voting Backend**  
*Priority: High | Estimate: 5 pts*  
**Acceptance Criteria:**
- POST `/api/rooms/:code/vote` accepts a ranked list of location IDs from a participant
- Votes stored: `{ participantId, rankings: [locationId, ...] }`
- Duplicate vote from same participant is rejected
- Endpoint to get current vote count (not full results) for admin: GET `/api/rooms/:code/votes/status`

**ITER1-016: Anti-Rigging: One Vote Per Participant**  
*Priority: Medium | Estimate: 3 pts*  
**Acceptance Criteria:**
- Logged-in users: enforce by userId
- Guest users: enforce by a session token or participantId issued at join time
- Backend rejects duplicate submissions with a clear error

---

#### Voting Close & Winner

**ITER1-017: Admin Closes Voting**  
*Priority: High | Estimate: 3 pts*  
**Acceptance Criteria:**
- Admin can press "Close Voting" at any time
- Room status transitions from `voting` to `completed`
- No further votes accepted after close
- Admin can also set an optional time limit when starting the vote (countdown displayed to all users)

**ITER1-018: Winner Calculation**  
*Priority: High | Estimate: 5 pts*  
**Description:** Determine the winner based on first-preference votes.  
**Acceptance Criteria:**
- Count first-preference votes for each location
- Location with the most first-preference votes wins
- In case of a tie, all tied locations are shown as winners
- Result stored on the room document: `{ winners: [locationId, ...], voteBreakdown: {} }`

**ITER1-019: Winner Announcement UI**  
*Priority: High | Estimate: 5 pts*  
**Acceptance Criteria:**
- All participants see the results screen after voting closes
- Winning location(s) displayed prominently with name, address, and category
- Google Maps link for each winner (direct link format: `https://www.google.com/maps/search/?api=1&query={lat},{lng}`)
- Vote breakdown shown (how many first-preference votes each location received)
- If tie, clearly indicate multiple winners

---

#### Project Setup

**ITER1-020: Project Scaffolding**  
*Priority: High | Estimate: 5 pts*  
**Acceptance Criteria:**
- Monorepo or separate `/client` and `/server` directories
- React app bootstrapped (Vite or CRA)
- Express server with basic folder structure (routes, controllers, models, middleware)
- MongoDB connection setup (Mongoose)
- Environment variable configuration (.env)
- CORS configured for local development
- README with setup instructions

**ITER1-021: Deployment Setup**  
*Priority: Low | Estimate: 3 pts*  
**Acceptance Criteria:**
- Basic deployment pipeline (e.g., Vercel for frontend, Railway/Render for backend, MongoDB Atlas for DB)
- Environment variables configured for production
- App accessible via a public URL for demo purposes

---

### Iteration 1 Total: ~21 tickets

---

## Iteration 2: Live Algorithm & Real-Time Voting

**Goal:** Replace all static/hardcoded elements with real integrations. The location algorithm uses Google Maps/Places API. Voting is real-time via Socket.IO. The product is now functionally complete for the core use case.

### Core Features
- Google Places API integration for location recommendations
- Location recommendation algorithm (geographic midpoint, category filtering, dietary constraints)
- Google Places Autocomplete for admin custom locations
- Real-time room updates via Socket.IO (join notifications, vote count, voting closed, winner)
- "Use current location" with proper reverse geocoding
- Optional voting timer with live countdown

### Tickets

#### Google Maps / Places Integration

**ITER2-001: Google Places API Setup**  
*Priority: High | Estimate: 3 pts*  
**Acceptance Criteria:**
- Google Cloud project configured with Places API and Maps JavaScript API enabled
- API key stored securely in environment variables
- Backend proxy for Places API calls (key never exposed to client)

**ITER2-002: Location Recommendation Algorithm**  
*Priority: High | Estimate: 13 pts*  
**Description:** The core algorithm that suggests up to 5 meeting locations based on participant data.  
**Acceptance Criteria:**
- Calculate geographic midpoint (weighted centroid) from all participant locations
- Use Google Places Nearby Search with the midpoint as center
- Filter by admin-selected categories (map internal categories to Google place types)
- Factor in dietary requirements when category is food-related (e.g., search for "vegan restaurant" if a participant has vegan dietary requirement)
- Rank results by: distance fairness (minimize maximum travel time across all participants), rating, and relevance to dietary needs
- Return up to 5 locations with: name, address, category, lat, lng, rating, photo reference, Google Maps URL
- Handle edge cases: no results found, participants very far apart

**ITER2-003: Transportation-Aware Distance Calculation**  
*Priority: High | Estimate: 5 pts*  
**Acceptance Criteria:**
- Use Google Distance Matrix API to calculate travel time from each participant to each candidate location
- Respect each participant's chosen transportation mode
- Algorithm scoring uses travel time (not just straight-line distance)
- Cache results to minimize API calls

**ITER2-004: Reverse Geocoding for "Use Current Location"**  
*Priority: Medium | Estimate: 3 pts*  
**Acceptance Criteria:**
- When user clicks "Use current location," browser geolocation captures lat/lng
- Backend or client calls Google Geocoding API to resolve suburb/locality name
- Suburb name displayed in the location field; lat/lng stored for algorithm use

**ITER2-005: Google Places Autocomplete for Admin Custom Locations**  
*Priority: Medium | Estimate: 5 pts*  
**Acceptance Criteria:**
- Admin's "Add Location" input uses Google Places Autocomplete
- On selection, the full place details are fetched and stored (name, address, lat, lng, place_id, Google Maps URL)
- Replaces the plain text input from Iteration 1

---

#### Real-Time with Socket.IO

**ITER2-006: Socket.IO Server Setup**  
*Priority: High | Estimate: 5 pts*  
**Acceptance Criteria:**
- Socket.IO integrated with the Express server
- Room-based namespacing: each room code maps to a Socket.IO room
- Authentication: socket connections from logged-in users carry JWT; guest users carry their participant token
- Reconnection handling with state sync

**ITER2-007: Real-Time Room Lobby Updates**  
*Priority: High | Estimate: 5 pts*  
**Acceptance Criteria:**
- When a new participant joins, all users in the room receive an update (no page refresh)
- Participant list updates in real time
- Admin actions (category selection, triggering algorithm) broadcast to all participants
- Room status changes (waiting to voting) pushed to all clients

**ITER2-008: Real-Time Voting Updates**  
*Priority: High | Estimate: 5 pts*  
**Acceptance Criteria:**
- When a participant submits their vote, all users see the updated vote count (not who voted for what, just "X of Y have voted")
- When admin closes voting, all users immediately transition to the results screen
- Winner announcement pushed to all clients simultaneously

**ITER2-009: Live Voting Timer**  
*Priority: Medium | Estimate: 3 pts*  
**Acceptance Criteria:**
- Admin can optionally set a timer (e.g., 1, 3, 5 minutes) when starting the vote
- Countdown displayed to all participants in real time (synced via server timestamp)
- Voting auto-closes when timer expires
- Admin can still close voting early

---

#### Algorithm Enhancements

**ITER2-010: Preference String Processing**  
*Priority: Medium | Estimate: 5 pts*  
**Description:** Use participant preference strings to refine recommendations.  
**Acceptance Criteria:**
- Parse user preference strings for keywords (e.g., "quiet," "outdoor seating," "good wifi")
- Use keywords as additional search terms or filters when querying Google Places
- Preferences influence ranking but don't hard-exclude results

**ITER2-011: Location Card Enhancement**  
*Priority: Medium | Estimate: 3 pts*  
**Acceptance Criteria:**
- Location cards in the voting UI show: photo (from Google Places), name, address, rating, price level, category
- Each card includes estimated travel time for the current user based on their transportation mode
- Google Maps link opens in a new tab

---

### Iteration 2 Total: ~11 tickets

---

## Iteration 3: Location Tracking, Solo Mode & Polish

**Goal:** Add the live location tracking feature for event day, solo room mode, room reuse functionality, and general polish for a production-ready feel.

### Core Features
- Live location tracking on event day
- Solo room mode (single user, no voting)
- Room reset/reuse for future events
- Guest user identification for returning to rooms
- Notification-style updates
- UI/UX polish and edge case handling

### Tickets

#### Location Tracking

**ITER3-001: "Start Going to Event" Button & Location Sharing**  
*Priority: High | Estimate: 8 pts*  
**Description:** After a winner is announced, participants can opt in to share their live location as they travel to the event.  
**Acceptance Criteria:**
- Button appears on the results screen: "Start going to event"
- On click, requests browser geolocation permission (with clear explanation)
- Sends location update to server every 60 seconds via Socket.IO
- Location data: `{ participantId, lat, lng, timestamp }`
- User can stop sharing at any time with a "Stop sharing" / "I've arrived" button
- Location sharing is opt-in; users who don't press the button are not tracked

**ITER3-002: Live Map View**  
*Priority: High | Estimate: 8 pts*  
**Acceptance Criteria:**
- Google Maps embedded view showing: the destination (winner location) as a primary pin, each participant who is sharing as a colored pin with their name
- Pins update in real time as new location data comes in
- "Last updated X minutes ago" shown per participant
- Participants who have pressed "I've arrived" shown with a distinct marker/style

**ITER3-003: Location Sharing Privacy Controls**  
*Priority: Medium | Estimate: 3 pts*  
**Acceptance Criteria:**
- Location data is ephemeral; deleted from the server when all participants stop sharing or 1 hour after the event
- Admin can toggle whether location tracking is available for the room
- Clear privacy notice shown before a user starts sharing

**ITER3-004: Guest User Room Re-Entry**  
*Priority: Medium | Estimate: 5 pts*  
**Description:** Guest users returning for the tracking phase need to identify themselves.  
**Acceptance Criteria:**
- Guest user visits the room link and sees a list of guest names from the voting phase
- They select their name (similar to Kahoot or When2Meet)
- Simple verification: match by name + a session cookie if available
- Once identified, they can access results and start location sharing

---

#### Solo Room Mode

**ITER3-005: Solo Room Creation**  
*Priority: High | Estimate: 5 pts*  
**Acceptance Criteria:**
- Logged-in user can create a "Solo Room" from the dashboard
- Solo room skips the join flow and room code generation
- User fills in: their location, dietary requirements, preferences, transportation mode
- User selects categories (same as admin flow)

**ITER3-006: Solo Room Algorithm & Results**  
*Priority: High | Estimate: 5 pts*  
**Acceptance Criteria:**
- Algorithm generates 5 recommendations based on the single user's inputs
- No voting phase; results displayed immediately
- User sees location cards with: name, address, rating, photo, travel time, Google Maps link
- Results are saved to the user's room history

---

#### Room Reset / Reuse

**ITER3-007: Admin Resets Room**  
*Priority: Medium | Estimate: 5 pts*  
**Acceptance Criteria:**
- Admin can press "Reset Room" from a completed room
- All participant locations are cleared and participants are prompted to update
- Guest users are removed from the room
- Logged-in participants remain but must re-enter their location
- Room status resets to `waiting`
- Previous results are archived (viewable in room history)
- Categories and custom locations are cleared

**ITER3-008: Room History**  
*Priority: Low | Estimate: 3 pts*  
**Acceptance Criteria:**
- Each room stores a history of past sessions (date, winner, participants, vote breakdown)
- Viewable from the room lobby or dashboard
- Helps groups avoid picking the same place repeatedly

---

#### Notifications & UX Polish

**ITER3-009: In-App Notifications**  
*Priority: Medium | Estimate: 5 pts*  
**Acceptance Criteria:**
- Toast notifications for key events: someone joined the room, voting has started, voting is closing soon (1 minute warning), winner announced
- Sound or visual cue for real-time updates
- Non-intrusive; dismissable

**ITER3-010: Responsive UI Polish**  
*Priority: Medium | Estimate: 5 pts*  
**Acceptance Criteria:**
- Mobile-first responsive design across all views
- Lobby, voting, and results screens work well on phone screens
- Map view (tracking) is usable on mobile
- Loading states and error handling for all async operations

**ITER3-011: Edge Case Handling**  
*Priority: Medium | Estimate: 5 pts*  
**Acceptance Criteria:**
- Algorithm returns fewer than 5 results: show what's available with a message
- No votes submitted: admin sees a warning before closing
- Participant disconnects mid-vote: their partial state is preserved on reconnect
- Room with only 1 participant (non-solo): allow proceeding but show a notice
- Admin leaves: room remains accessible but no admin actions available (future: admin transfer)

**ITER3-012: User Profile & Preferences**  
*Priority: Low | Estimate: 3 pts*  
**Acceptance Criteria:**
- Profile page where logged-in users can view/edit: name, default dietary requirements, default transportation mode, default preferences
- Defaults are pre-filled when joining a room

---

### Iteration 3 Total: ~12 tickets

---

## Summary

| Iteration | Tickets | Focus |
|-----------|---------|-------|
| 1 | 21 | Static demo, full flow end-to-end |
| 2 | 11 | Real algorithm, real-time voting |
| 3 | 12 | Tracking, solo mode, polish |
| **Total** | **44** | |

### Suggested Milestones
- **Iteration 1 complete:** Demo-ready prototype you can show stakeholders
- **Iteration 2 complete:** Functionally complete product for the core group use case
- **Iteration 3 complete:** Full feature set including tracking and solo mode; ready for beta users
