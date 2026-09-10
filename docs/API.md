# API Specification

All backend endpoints are mounted under `/api` and strictly validate authentication, roles, and event states.

## 1. Authentication (`/api/auth`)
- `POST /api/auth/login`: Authenticate with email & password, returns JWT and user profile.
- `POST /api/auth/logout`: Invalidate session / client token.
- `GET /api/auth/me`: Get current authenticated user details.
- `POST /api/auth/forgot-password`: Request password reset.
- `POST /api/auth/reset-password`: Complete password reset.

## 2. Admin Portal (`/api/admin`)
- `GET /api/admin/dashboard`: Metrics (total participants, judges, audience, judging/voting state).
- `GET /api/admin/categories` / `POST` / `PUT /:id` / `DELETE /:id`: Manage categories.
- `GET /api/admin/participants` / `POST` / `PUT /:id`: Manage performers.
- `GET /api/admin/judges` / `POST`: Manage judges.
- `POST /api/admin/judge-assignments`: Assign judges to categories.
- `GET /api/admin/audience`: Audience activity directory.
- `GET /api/admin/results`: Calculate and view 85/15 combined scores.
- `POST /api/admin/event/start` & `stop`: Transition event states.
- `POST /api/admin/results/lock` & `publish`: Freeze and publish official outcomes.
- `GET /api/admin/audit-logs`: Review historical audit trail.

## 3. Judge Portal (`/api/judge`)
- `GET /api/judge/dashboard`: Assigned categories summary.
- `GET /api/judge/categories`: Categories assigned to current judge.
- `GET /api/judge/participants`: Participants within assigned categories.
- `GET /api/judge/scores`: History of scores submitted by current judge.
- `POST /api/judge/scores`: Submit score (0 - 100). Sets `revision_count = 0`.
- `PUT /api/judge/scores/:id`: One-time edit. Sets `revision_count = 1`. Subsequent edits return `403 SCORE_EDIT_LIMIT_REACHED`.
- `GET /api/judge/scores/:id/history`: Audit log of edits made to this score.

## 4. Audience Portal (`/api/audience`)
- `GET /api/audience/dashboard`: Open voting categories.
- `GET /api/audience/categories`: Active voting categories.
- `GET /api/audience/participants/:categoryId`: Eligible performers.
- `GET /api/audience/vote-status`: Shows which categories the user has already voted in.
- `POST /api/audience/votes`: Cast vote. Enforces 1 vote per category, duplicate returns `409 ALREADY_VOTED`.

## 5. Help Desk Portal (`/api/helpdesk`)
- `GET /api/helpdesk/participants`: View and search participant registration list.
- `POST /api/helpdesk/register`: Register new participant and issue code.
- `GET /api/helpdesk/search?query=...`: Fast search by participant code or name.
