export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', req.headers?.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-device-id'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { regNo, studentId, phone, email } = req.body || {};
  const cleanReg = String(regNo || studentId || '').trim();
  const cleanPhone = String(phone || '').trim();
  const cleanEmail = String(email || '').trim().toLowerCase();

  const regNoRegex = /^12[0-6]\d{5}$/;
  if (!cleanReg || !regNoRegex.test(cleanReg)) {
    return res.status(400).json({ 
      success: false, 
      message: 'Registration number must be exactly 8 digits and start between 120 and 126 (e.g. 12440078).' 
    });
  }

  const phoneRegex = /^\d{10}$/;
  if (!cleanPhone || !phoneRegex.test(cleanPhone)) {
    return res.status(400).json({ success: false, message: 'Phone number must be exactly 10 digits.' });
  }

  const emailRegex = /^[a-zA-Z0-9._%+-]+@(gmail\.com|lpu\.in|outlook\.com)$/i;
  if (!cleanEmail || !emailRegex.test(cleanEmail)) {
    return res.status(400).json({ 
      success: false, 
      message: 'Email must belong to one of the 3 allowed domains: @gmail.com, @lpu.in, or @outlook.com.' 
    });
  }

  const token = `fts_aud_token_${cleanReg}_${Date.now()}`;
  return res.status(200).json({
    success: true,
    data: {
      token,
      user: {
        id: `usr_${cleanReg}`,
        name: `Student (${cleanReg})`,
        email: cleanEmail,
        studentId: cleanReg,
        regNo: cleanReg,
        phone: cleanPhone,
        role: 'AUDIENCE',
        status: 'ACTIVE'
      }
    },
    message: 'Audience authentication successful'
  });
}
