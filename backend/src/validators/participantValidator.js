export const validateParticipantRegistration = (body) => {
  const { name, categoryId, registrationNumber, phoneNumber, routineTitle, act, participantCode } = body;

  // 1. Performer Name
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return { valid: false, error: 'Performer Name is required' };
  }

  // 2. Category
  if (!categoryId || typeof categoryId !== 'string' || categoryId.trim().length === 0) {
    return { valid: false, error: 'Category selection is required' };
  }

  // 3. Registration Number
  if (!registrationNumber || typeof registrationNumber !== 'string' || registrationNumber.trim().length === 0) {
    return { valid: false, error: 'Registration Number is required' };
  }

  // 4. Phone Number & Format Validation
  if (!phoneNumber || typeof phoneNumber !== 'string' || phoneNumber.trim().length === 0) {
    return { valid: false, error: 'Phone Number is required' };
  }
  const digitsOnly = phoneNumber.replace(/[\s\-\(\)\+]/g, '');
  if (!/^\d{10,15}$/.test(digitsOnly)) {
    return { valid: false, error: 'Please enter a valid phone number (10 to 15 digits)' };
  }

  // 5. Act / Routine Title
  const routine = routineTitle || act;
  if (!routine || typeof routine !== 'string' || routine.trim().length === 0) {
    return { valid: false, error: 'Act/Routine Title is required' };
  }

  // 6. Participant Code / Chest Number (Manual input required)
  if (!participantCode || typeof participantCode !== 'string' || participantCode.trim().length === 0) {
    return { valid: false, error: 'Participant Code / Chest Number is required' };
  }

  return { valid: true };
};
