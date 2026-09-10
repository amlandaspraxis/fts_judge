# Database Layer

This directory maintains the PostgreSQL database schema, migrations, seed data, and raw queries as specified in `3969.txt`.

## Structure

```
database/
├── prisma/
│   ├── schema.prisma   # Declarative database models with relations & constraints
│   ├── migrations/     # Generated SQL migration history
│   └── seed.js         # Default data seeder
├── queries/
│   ├── users.sql       # Authentication & user profile queries
│   ├── scores.sql      # Judge scoring & audit history queries
│   ├── votes.sql       # Audience single-vote check & vote count queries
│   └── results.sql     # 85/15 calculated leaderboard & ranking queries
└── README.md
```

## Constraints Enforced
1. `UNIQUE(audience_id, category_id, event_id)`: Guarantees an audience user cannot vote more than once per category.
2. `UNIQUE(judge_id, participant_id)`: Prevents multiple score entries per judge for the same participant.
3. `revision_count`: Enforces the one-time edit policy for judges.
