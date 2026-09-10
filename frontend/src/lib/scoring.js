/**
 * Shared scoring utilities (implements math from design.md)
 */

export function judgesAvgOutOf10(judgeScores = [], judgeCriteria = []) {
  if (!judgeScores || judgeScores.length === 0) return null;
  const criteriaMap = Object.fromEntries((judgeCriteria || []).map(c => [c.id, Number(c.max_marks)]));

  const byJudge = Object.create(null);
  for (const s of judgeScores) {
    const judgeId = s.judge_id ?? s.judgeId ?? s.judgeId;
    const criterionId = s.criterion_id ?? s.criterionId ?? s.criterionId;
    const marks = Number(s.marks ?? s.score ?? 0);
    const max = Number(criteriaMap[criterionId] ?? 10);
    if (!byJudge[judgeId]) byJudge[judgeId] = { sum: 0, maxSum: 0 };
    byJudge[judgeId].sum += marks;
    byJudge[judgeId].maxSum += max;
  }

  const perJudge = Object.values(byJudge).map(j => {
    if (j.maxSum === 0) return 0;
    return (j.sum / j.maxSum) * 10;
  });

  if (perJudge.length === 0) return null;
  const avg = perJudge.reduce((a, b) => a + b, 0) / perJudge.length;
  return avg;
}

export function audienceAvg(votes = []) {
  if (!votes || votes.length === 0) return null;
  const sum = votes.reduce((a, v) => a + Number(v.score ?? v.value ?? 0), 0);
  return sum / votes.length;
}

export function finalScore(judgesAvgOutOf10Val, audienceAvgVal, judgeWeight = 60, audienceWeight = 40) {
  if (judgesAvgOutOf10Val == null && audienceAvgVal == null) return null;
  const j = judgesAvgOutOf10Val ?? 0;
  const a = audienceAvgVal ?? 0;
  return (j * Number(judgeWeight) + a * Number(audienceWeight)) / 100;
}

export function computeParticipantScores({ judgeScores = [], judgeCriteria = [], votes = [], judgeWeight = 60, audienceWeight = 40 }) {
  const jAvg = judgesAvgOutOf10(judgeScores, judgeCriteria);
  const aAvg = audienceAvg(votes);
  const final = finalScore(jAvg, aAvg, judgeWeight, audienceWeight);
  return { judgesAvg: jAvg, audienceAvg: aAvg, finalScore: final };
}

export function sortParticipantsByCode(participantsList = []) {
  return [...participantsList].sort((a, b) => {
    if (!a.code && !b.code) return 0;
    if (!a.code) return 1;
    if (!b.code) return -1;

    // Extract prefix, numeric portion, and any suffix
    const matchA = String(a.code).trim().match(/^([A-Za-z]+)?\s*(\d+)?(.*)$/);
    const matchB = String(b.code).trim().match(/^([A-Za-z]+)?\s*(\d+)?(.*)$/);

    const prefixA = (matchA?.[1] || "").toUpperCase();
    const prefixB = (matchB?.[1] || "").toUpperCase();

    if (prefixA !== prefixB) {
      return prefixA.localeCompare(prefixB);
    }

    const numA = matchA?.[2] !== undefined && matchA[2] !== "" ? parseInt(matchA[2], 10) : null;
    const numB = matchB?.[2] !== undefined && matchB[2] !== "" ? parseInt(matchB[2], 10) : null;

    if (numA !== null && numB !== null) {
      if (numA !== numB) return numA - numB;
    }

    return String(a.code).localeCompare(String(b.code), undefined, { numeric: true, sensitivity: "base" });
  });
}

export default { judgesAvgOutOf10, audienceAvg, finalScore, computeParticipantScores, sortParticipantsByCode };
