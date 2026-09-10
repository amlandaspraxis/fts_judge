-- Query: Select active users by role
SELECT id, name, email, role, status, created_at
FROM users
WHERE status = 'ACTIVE'
ORDER BY name ASC;

-- Query: Authenticate user by email
SELECT id, name, email, password_hash, role, status
FROM users
WHERE email = $1;
