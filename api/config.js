// Vercel Serverless Function to dynamically serve environment variables at runtime
module.exports = (req, res) => {
  // CORS Security: Allow only specific origins
  const allowedOrigins = [
    'https://yundev.space',
    'https://www.yundev.space',
    'https://tinh-luong.yundev.space',
    'http://localhost:5173', // Vite local
    'http://127.0.0.1:5173'
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    // Fallback or deny - for strictly internal APIs, you might choose not to set it
    // But since this is a GET, we just set a safe default if no origin is provided
    res.setHeader('Access-Control-Allow-Origin', 'https://yundev.space');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

  res.status(200).json({
    supabaseUrl,
    supabaseAnonKey
  });
};
