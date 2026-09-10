export const validateAudienceVote = (body) => {
  const { participantId, categoryId } = body;
  if (!participantId || !categoryId) {
    return { valid: false, error: 'participantId and categoryId are required' };
  }
  return { valid: true };
};
