# Results UI Design (ITER1-019)

**Date:** 2026-05-21
**Branch:** `feat/ui-results`
**Ticket:** ITER1-019 — Winner Announcement UI

## Goal

Replace the placeholder in `components/room/RoomPageClient.tsx:90-97` with a real
results screen shown to every participant once a room transitions to
`completed` or `closed`. The screen reads from `GET /api/rooms/[code]/results`
(introduced in commit `237663d`, replacing the older `winners` endpoint).

## API Contract (already implemented)

`GET /api/rooms/[code]/results?participantId=<id>`

- Auth: participant must be in the room (participantId param or session user).
- 200 response shape:
  ```ts
  { results: Array<Location & { votes: number; rank: number }> }
  ```
- Results are sorted by `votes` descending; ranks use standard tournament
  ranking (`1, 2, 2, 4`), so ties share the same rank value.
- Error cases: 401 unauthorized, 400 if room is still in voting, 404 if no
  room.

## Acceptance Criteria (from ticket)

- All participants see the results screen when status is `completed`/`closed`.
- Winning location(s) shown prominently with name, address, category.
- Google Maps link per winner: `https://www.google.com/maps/search/?api=1&query={lat},{lng}`.
- Vote breakdown shown for every location (first-preference counts).

## Design Decisions (confirmed with user)

- **Layout**: two-column layout mirroring `VotingView` (lg:col-span-5 left,
  lg:col-span-7 right). Map on the right. Single-column collapse on mobile.
- **Ties**: side-by-side equal cards with explicit "It's a tie!" headline.
- **Breakdown**: full ranked list always visible, each row with a horizontal
  vote-percentage bar.
- **Extras**: "Back to home" CTA at the bottom.

## File Plan

Everything lives in one file. This screen is shown once at the end of a
room's lifecycle — no reuse, no shared state with other views — so splitting
it across multiple files would just be ceremony. Mirrors the pattern in
`VotingView.tsx`, which inlines its `VotingHeader` and `AdminCloseButton`
helpers at the bottom of the same file.

### New files

- `components/room/ResultsView.tsx`
  Single self-contained file. Top-level `ResultsView` (default export) plus
  inline helper components: `Header`, `Podium`, `Breakdown`. Also inlines
  the fetch — one axios call, no need for a separate `lib/results.ts`.

### Edited files

- `types/room.ts`
  Add `LocationResult` type: `Location & { votes: number; rank: number }`.

- `components/room/RoomPageClient.tsx`
  Replace the placeholder branch (lines 90-97) with
  `<ResultsView room={room} currentParticipantId={currentParticipantId} />`.

- `components/room/index.ts`
  Export `ResultsView`.

## Component Details (all inside `ResultsView.tsx`)

### `ResultsView` (top-level, default export)

- State: `results`, `loading`, `error`.
- `useEffect` on mount: fetches `/rooms/{code}/results?participantId=...`
  via the existing `api` axios instance. Inlined — not a separate lib
  helper.
- Layout:
  - `<Header>` at top: room name, "Results are in!" subtitle, scheduled-date
    chip, direction chip (local mini-component, mirrors `VotingHeader`
    style but doesn't try to share code with it).
  - Left column (col-span-5): `<Podium>` → `<Breakdown>` → "Back to home"
    button (links to `/`).
  - Right column (col-span-7): sticky Mapbox map, inlined in the JSX with
    its own `useEffect` for setup/teardown.
- Loading: `Loader2` spinner centered.
- Error states:
  - 401 → "You're not authorized to see these results."
  - 400 → "Voting hasn't finished yet." (fallback; shouldn't normally trigger
    because parent gates on status).
  - Other → generic "Failed to load results."

### `Podium` (inline helper)

Props: `{ winners: LocationResult[] }` (caller filters by `rank === 1`).

- 1 winner → centered card, 24px trophy, name (text-2xl), description,
  category pill, votes count, Maps button.
- 2+ winners → "It's a tie!" + flex row (`flex-wrap gap-4`) of cards. Cards
  are equal width via `flex-1 min-w-[240px]`. Same internal layout as the
  single case but slightly smaller text. Mobile (`sm:` and down) collapses
  the flex row to stacked.

### `Breakdown` (inline helper)

Props: `{ results: LocationResult[] }`.

- Rows already sorted by API; render in order.
- For each row, compute `pct = maxVotes > 0 ? (votes / maxVotes) * 100 : 0`.
- Row layout: rank badge (left, fixed width), name + category (middle,
  flexible), votes number + percentage bar (right). Bar is `bg-cyan-100`
  track, `bg-cyan-600` fill, animates width on mount via CSS transition.
- Winners (`rank === 1`) get a subtle `bg-amber-50 dark:bg-amber-950/20`
  tint and amber accent bar.
- Zero-votes case: show "No first-preference votes" muted text instead of
  the bar; still render the rank.

### Map (right column, inline in `ResultsView`)

- Reuse the Mapbox init pattern from `VotingView.tsx:211-244`. Keep it
  self-contained inside `ResultsView` for now — a shared `<RoomMap>`
  extraction is tempting but out of scope for ITER1-019.
- Markers:
  - Winners (`rank === 1`) → amber pill with trophy + name.
  - Others → cyan pill with rank number + name (like the existing voting
    markers).
- Auto fit-bounds to all locations on load.
- No routing layer (results are not user-specific).

## Edge Cases

- **Single location** (room only has 1 candidate): podium renders single
  winner; breakdown lists just that row.
- **Zero votes** (room closed before anyone voted): every location has
  `votes: 0`. API still returns them sorted by `_id` (well, original order)
  with all `rank: 1`. We'll treat that as a "no winner determined" state:
  podium shows a muted "No votes were cast" card; breakdown lists everyone
  with empty bars.
- **API 400 race** (status change between gate-check and fetch): show error
  message and a retry button.
- **Maps URL with missing lat/lng**: shouldn't happen — locations are
  validated upstream — but defensive fallback hides the Maps CTA rather
  than producing a broken link.

## Polling Behavior

`RoomPageClient` already polls every 5s when status ≠ voting. Results are
immutable once `completed`, so the existing parent polling is harmless. We
won't introduce additional polling inside `ResultsView`; it fetches results
once on mount.

## Testing Plan

Manual verification:

1. Single winner case — vote so one location wins outright, admin closes
   voting, confirm hero card + breakdown + map highlight.
2. Tie case — manually equalize first-preference votes in the DB, confirm
   tie podium + repeated rank badges.
3. Zero-votes case — admin closes voting with no votes cast, confirm muted
   state.
4. Mobile responsive — single column, podium tie row stacks.
5. Dark mode — verify amber tints and cyan accents read correctly.
6. Maps link — open one, confirm it points at the right coordinates.
7. Auth — open as a non-participant (with bad participantId) and confirm
   401 message.

## Out of Scope

- A shared `<RoomMap>` extraction across voting + results views.
- Animations / confetti.
- Re-vote / new-room CTAs beyond a plain "Back to home" link.
- Real-time updates (results are immutable post-close).
