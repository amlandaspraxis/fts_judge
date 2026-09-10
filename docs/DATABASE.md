# Database Design & Architecture

## Tables
1. **users**: Admin, Judge, Audience, and Help Desk accounts with Argon2id/Bcrypt `password_hash`.
2. **events**: Event lifecycle state: `SETUP`, `JUDGING_OPEN`, `VOTING_OPEN`, `JUDGING_CLOSED`, `VOTING_CLOSED`, `RESULTS_LOCKED`, `RESULTS_PUBLISHED`.
3. **categories**: Competition categories (*Dance, Singing, Comedy, Band, Drama, Poetry*).
4. **participants**: Performers with unique `participant_code` (e.g. `DANCE-001`).
5. **judge_assignments**: Many-to-many link restricting judges to assigned categories.
6. **judge_scores**: Raw judge scores with `revision_count` and `locked` flag.
7. **score_history**: Immutable append-only audit records of score adjustments.
8. **audience_votes**: Audience votes enforced by `UNIQUE(audience_id, category_id, event_id)`.
9. **results**: Normalized calculations computed by the backend result service.
10. **audit_logs**: Tamper-evident trail of administrative and scoring actions.

## Scoring Formula
$$\text{Final Score} = (\text{Judge Score} \times 0.85) + (\text{Audience Score} \times 0.15)$$
Both components are normalized out of 100 before weighting.
