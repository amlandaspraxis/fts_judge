# Security Architecture & Rules

## 1. Authentication & Tokens
- Passwords are never stored in plain text (hashed via bcrypt with salt factor 10).
- Authentication tokens are signed with JWT or stored in secure HTTP-only cookies.
- Unauthorized or malformed tokens receive `401 Unauthorized`.

## 2. Server-Controlled Authorization (RBAC)
- Role verification (`ADMIN`, `JUDGE`, `AUDIENCE`, `HELP_DESK`) occurs on every endpoint before business logic executes.
- Frontend role checks exist for UX navigation, but backend middleware enforces true authorization.

## 3. Judge Score Integrity
- Judges can only view and score categories assigned to their `judge_id`.
- Scores can be submitted once (`revision_count = 0`).
- Judges are allowed exactly **one edit** (`revision_count = 1`). A second edit attempt triggers `403 SCORE_EDIT_LIMIT_REACHED`.
- All modifications write an append-only entry to `score_history`.

## 4. Audience Voting Integrity
- Unique constraint `(audience_id, category_id, event_id)` prevents multi-voting in a category.
- Voting requests submitted while the event is not in `VOTING_OPEN` receive `403 VOTING_CLOSED`.

## 5. Audit Logging
- High-privilege operations (Category creation/deletion, score edits, results locking, publishing) are automatically recorded in `audit_logs` with actor ID, timestamp, and IP.
