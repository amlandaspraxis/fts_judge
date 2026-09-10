export const validateJudgeScore = (body) => {
  const { participantId, categoryId, score } = body;
  if (!participantId || !categoryId) {
    return { valid: false, error: 'participantId and categoryId are required' };
  }
  const numericScore = Number(score);
  if (isNaN(numericScore) || numericScore < 0 || numericScore > 100) {
    return { valid: false, error: 'Score must be a number between 0 and 100' };
  }
  return { valid: true, numericScore };
};
