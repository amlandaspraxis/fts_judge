-- Query: Leaderboard ranking with 85% Judge + 15% Audience weighting
SELECT 
  r.id,
  r.category_id,
  c.name AS category_name,
  r.participant_id,
  p.participant_code,
  p.name AS participant_name,
  r.judge_score,
  r.audience_score,
  r.final_score,
  r.rank,
  r.calculated_at
FROM results r
JOIN categories c ON r.category_id = c.id
JOIN participants p ON r.participant_id = p.id
WHERE r.event_id = $1 AND r.category_id = $2
ORDER BY r.final_score DESC, r.judge_score DESC;
