import type { NextApiRequest, NextApiResponse } from 'next';

const isProd = process.env.NODE_ENV === 'production';

function buildCookie(name: string, value: string, maxAge: number) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
  ];

  if (isProd) {
    parts.push('Secure');
  }

  return parts.join('; ');
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { accessToken, refreshToken } = req.body || {};

    if (!accessToken || !refreshToken) {
      return res.status(400).json({ message: 'accessToken and refreshToken are required' });
    }

    res.setHeader('Set-Cookie', [
      buildCookie('overline_access_token', accessToken, 60 * 15),
      buildCookie('overline_refresh_token', refreshToken, 60 * 60 * 24 * 7),
    ]);

    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', [
      buildCookie('overline_access_token', '', 0),
      buildCookie('overline_refresh_token', '', 0),
    ]);

    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', 'POST, DELETE');
  return res.status(405).json({ message: 'Method not allowed' });
}
