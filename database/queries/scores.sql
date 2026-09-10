-- Query: Select judge scores with participant details
SELECT 
  js.id, js.judge_id, u.name AS judge_name, js.participant_id, p.name AS participant_name,
  p.participant_code, js.score, js.revision_count, js.locked, js.submitted_at
FROM judge_scores js
JOIN users u ON js.judge_id = u.id
JOIN participants p ON js.participant_id = p.id
WHERE js.category_id = $1;

-- Query: Score history audit
SELECT id, score_id, old_score, new_score, changed_by, reason, changed_at
FROM score_history
WHERE score_id = $1
ORDER BY changed_at DESC;
