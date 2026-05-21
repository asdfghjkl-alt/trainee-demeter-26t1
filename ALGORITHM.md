# Rendezvous Algorithm

This document explains the inner workings of the Rendezvous Location Generation Algorithm. The goal of the algorithm is to take the coordinates, transportation modes, and maximum travel time budget of multiple participants, and mathematically determine the most fair and optimal venues for them to meet.

## Pipeline Overview

The algorithm runs in five distinct stages:

1. **Reachable Zones Generation (Isochrones)**
2. **Intersection & Fallback**
3. **Geographical Centroid Calculation**
4. **Venue Search**
5. **Travel-Time Matrix & Scoring**

---

### Step 1: Reachable Zones Generation (Isochrones)
For each participant, the algorithm contacts the **Mapbox Isochrone API** to draw an amoeba-like shape (a polygon) around their starting coordinate. This polygon represents the absolute boundary of how far they can travel given their `transportationMode` (driving, walking, cycling) within the `travelBudgetMinutes`.

**Special Handling:**
- **Mapbox Limit:** Mapbox caps the `contours_minutes` API parameter at 60 minutes. If a participant's travel budget exceeds 60 minutes, the algorithm fetches the 60-minute polygon and uses **Turf.js (`@turf/buffer`)** to artificially expand the polygon outwards by the calculated distance they could cover in the remaining time.
- **Transit Mode:** Mapbox does not natively support public transit. For participants using transit, the algorithm falls back to the `cycling` profile and applies a `TRANSIT_ISOCHRONE_MULTIPLIER` (currently 1.2x) to the budget. This is because a cyclist's average speed (~15km/h) is a much better geographical approximation of average door-to-door urban transit speed than walking.

### Step 2: Intersection & Fallback
Once all polygons are generated, the algorithm uses **Turf.js (`@turf/intersect`)** to progressively overlay them. The resulting area is the "overlapping zone" that every participant can physically reach within their travel budget.

**Fallback Mechanism:**
If the participants are located so far apart that their polygons physically cannot overlap (meaning the travel budget is mathematically too small for them to meet in the middle), the intersection fails. When this happens:
1. The algorithm triggers the "Fallback" flag.
2. Instead of using a polygon, it calculates the mathematical **Geographic Midpoint** (the exact average of all participant latitudes and longitudes).
3. A warning disclaimer is saved to the room to notify users that the travel budget was insufficient and the fallback was used.

### Step 3: Dual-Proximity Search Anchors
The algorithm mathematically calculates two distinct search anchors to cast a wide net for potential venues:
1. **Geographical Midpoint:** The exact mathematical average of all participant latitudes and longitudes. This anchor finds venues tightly clustered around the actual users (perfect for situations with huge travel budgets where the reachable area covers the entire city).
2. **Intersection Centroid:** The geographic centre of the reachable intersection polygon (calculated in Step 2). This anchor finds venues perfectly central to the physical travel boundaries (perfect for edge cases where the geographical midpoint lands in the ocean or a remote unpopulated area).

### Step 4: Venue Search
Using **both** of the anchors from Step 3, the algorithm queries the **Mapbox Search Box API**.
- It iterates through all the `categories` selected by the room Admin (e.g., Cafes, Restaurants, Parks).
- It performs a search around the Geographic Midpoint and a separate search around the Intersection Centroid, pulling up to 8 Points of Interest (POIs) per category per anchor.
- It pools all the venues together, shuffling them and strictly removing duplicates (e.g. multiple venues with the same name and exact same address) to create a diverse candidate pool.

### Step 5: Travel-Time Matrix & Scoring
With a diverse list of raw candidate venues from both search anchors, the algorithm takes up to 30 candidates and builds a precise travel-time matrix to score them. By feeding the matrix venues from both anchors, the scoring formula guarantees that flawed locations (e.g. venues in the ocean or artificially pulled to the city centre) are objectively punished by high travel times, allowing the true mathematically optimal venue to win.

1. **Routing Engines:**
   - **Transit:** The algorithm attempts to use the **Transport for NSW (TfNSW) Trip Planner API** to get real-time train and bus schedules between the participant and the venue. If TfNSW fails, it falls back to Mapbox's `driving-traffic` profile and applies a `1.5x` time multiplier (a standard urban heuristic representing the extra time spent walking to stations and waiting for vehicles).
   - **Driving/Walking/Cycling:** The algorithm queries the **Mapbox Directions API** for exact travel times.

2. **Meeting Direction:** 
   The algorithm respects the room's `meetingDirection` setting (e.g., traveling *to* the venue vs. traveling *from* the venue). It correctly flips the origin and destination coordinates when querying the APIs to account for one-way streets, traffic flow, and transit schedules.

3. **Composite Penalty Score:**
   Each candidate venue receives a penalty score (lower is better). The formula balances individual fairness with group efficiency:
   
   ```javascript
   Score = (0.5 * MaxCommute) + (0.3 * MeanCommute) + (0.2 * StandardDeviation)
   ```
   - **Max Commute (50% weight):** Heavily penalizes venues where one person has a terrible commute.
   - **Mean Commute (30% weight):** Rewards venues that are generally close for the group on average.
   - **Standard Deviation (20% weight):** Rewards venues where everyone has a roughly equal commute time (fairness).

### Final Output
The algorithm sorts the venues by their penalty score and returns the top 5 locations. These are automatically saved to the database and presented to the participants for voting.
