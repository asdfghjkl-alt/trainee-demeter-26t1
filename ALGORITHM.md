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
- **Transit Mode:** Mapbox does not natively support public transit. For participants using transit, the algorithm falls back to the `walking` profile but applies a `TRANSIT_ISOCHRONE_MULTIPLIER` (currently 2x) to the budget, creating a larger "walking bubble" that roughly approximates a transit catchment area.

### Step 2: Intersection & Fallback
Once all polygons are generated, the algorithm uses **Turf.js (`@turf/intersect`)** to progressively overlay them. The resulting area is the "overlapping zone" that every participant can physically reach within their travel budget.

**Fallback Mechanism:**
If the participants are located so far apart that their polygons physically cannot overlap (meaning the travel budget is mathematically too small for them to meet in the middle), the intersection fails. When this happens:
1. The algorithm triggers the "Fallback" flag.
2. Instead of using a polygon, it calculates the mathematical **Geographic Midpoint** (the exact average of all participant latitudes and longitudes).
3. A warning disclaimer is saved to the room to notify users that the travel budget was insufficient and the fallback was used.

### Step 3: Geographical Centroid Calculation
Assuming the intersection was successful, the algorithm calculates the exact geographical center (`centroid`) of the resulting overlapping polygon. This coordinate serves as the optimal "middle ground" for the entire group.

### Step 4: Venue Search
Using the centroid (or the geographic midpoint from the fallback), the algorithm queries the **Mapbox Search Box API**.
- It iterates through all the `categories` selected by the room Admin (e.g., Cafes, Restaurants, Parks).
- It pulls up to 8 Points of Interest (POIs) per category.
- It consolidates the results and removes duplicates (e.g. multiple venues with the same name and exact same address).

### Step 5: Travel-Time Matrix & Scoring
With a list of raw candidate venues, the algorithm takes the top 20 and builds a precise travel-time matrix to score them.

1. **Routing Engines:**
   - **Transit:** The algorithm attempts to use the **Transport for NSW (TfNSW) Trip Planner API** to get real-time train and bus schedules between the participant and the venue. If TfNSW fails, it falls back to Mapbox's `walking` profile.
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
