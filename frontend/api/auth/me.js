export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', req.headers?.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-device-id'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Missing or invalid authorization token' });
  }

  const token = authHeader.split(' ')[1] || '';

  // 1. Audience client token
  if (token.startsWith('fts_aud_') || token.startsWith('fts_aud_token_')) {
    const parts = token.split('_');
    const regNo = parts.find(p => /^12[0-6]\d{5}$/.test(p)) || '12440078';
    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: `usr_${regNo}`,
          name: `Student (${regNo})`,
          studentId: regNo,
          regNo: regNo,
          email: `${regNo.toLowerCase()}@student.local`,
          role: 'AUDIENCE',
          status: 'ACTIVE'
        }
      },
      message: 'Current user profile'
    });
  }

  // 2. Default fallback response for valid active session
  return res.status(200).json({
    success: true,
    data: {
      user: {
        id: 'usr_audience',
        name: 'Student Voter',
        role: 'AUDIENCE',
        status: 'ACTIVE'
      }
    },
    message: 'Current user profile'
  });
}
