-- Query: Count audience votes per participant in a category
SELECT 
  p.id AS participant_id,
  p.participant_code,
  p.name AS participant_name,
  COUNT(av.id) AS total_votes
FROM participants p
LEFT JOIN audience_votes av ON p.id = av.participant_id
WHERE p.category_id = $1
GROUP BY p.id, p.participant_code, p.name
ORDER BY total_votes DESC;

-- Query: Check if audience member already voted in a category
SELECT id, participant_id, submitted_at
FROM audience_votes
WHERE audience_id = $1 AND category_id = $2 AND event_id = $3;
