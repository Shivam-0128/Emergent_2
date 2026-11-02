# PRD — Habit Circle (community habit tracker)

## Original problem statement
Simple community habit tracking site for friends/colleagues: sign up/sign in (no email confirmation), My habits (private/shared, "When I do it"), habit page with "Last 7 days" date checkboxes (YYYY-MM-DD), "Days done:" and "Current streak:", Community page of shared habits only, comments with author names. Keep simple; no extra features.

## Architecture
- FastAPI + MongoDB (users, habits, ticks, comments, login_attempts); JWT Bearer token (30 days) stored in localStorage; bcrypt passwords; brute-force lockout (5 fails / 15 min).
- React: /signup, /signin, /habits, /habits/:id, /community; top nav + sidebar + Sign out.
- Private habits return 404 to non-owners; only owner can tick (403 otherwise).

## Implemented (2026-06)
- All 6 requirement sections implemented and tested (iteration_1); fixed lockout IP detection and mobile sidebar.

## Backlog
- P2: none requested. Possible: edit/delete habits, toggle sharing (deliberately not added).
