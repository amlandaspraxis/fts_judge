export const validateLogin = (body) => {
  const { email, password } = body;
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return { valid: false, error: 'Valid email is required' };
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    return { valid: false, error: 'Password must be at least 6 characters' };
  }
  return { valid: true };
};

export const validateAudienceLogin = (body) => {
  const { regNo, studentId, phone, email } = body || {};
  const cleanReg = String(regNo || studentId || '').trim();
  const cleanPhone = String(phone || '').trim();
  const cleanEmail = String(email || '').trim().toLowerCase();

  // Registration number validation: exactly 8 digits, starts with 120xxxxx to 126xxxxx (12000000 - 12699999)
  const regNoRegex = /^12[0-6]\d{5}$/;
  if (!cleanReg) {
    return { valid: false, error: 'Registration number is required.' };
  }
  if (!regNoRegex.test(cleanReg)) {
    return { 
      valid: false, 
      error: 'Registration number must be exactly 8 digits and start between 120 and 126 (e.g. 12440078).' 
    };
  }

  // Phone number validation: exactly 10 digits
  const phoneRegex = /^\d{10}$/;
  if (!cleanPhone) {
    return { valid: false, error: 'Phone number is required.' };
  }
  if (!phoneRegex.test(cleanPhone)) {
    return { 
      valid: false, 
      error: 'Phone number must be exactly 10 digits.' 
    };
  }

  // Email validation: must be from @gmail.com, @lpu.in, or @outlook.com
  const emailRegex = /^[a-zA-Z0-9._%+-]+@(gmail\.com|lpu\.in|outlook\.com)$/i;
  if (!cleanEmail) {
    return { valid: false, error: 'Email address is required.' };
  }
  if (!emailRegex.test(cleanEmail)) {
    return { 
      valid: false, 
      error: 'Email must belong to one of the 3 allowed domains: @gmail.com, @lpu.in, or @outlook.com.' 
    };
  }

  return { valid: true };
};

