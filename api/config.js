// Vercel Serverless Function to dynamically serve environment variables at runtime
module.exports = (req, res) => {
  // Set CORS headers so it can be requested safely
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

  res.status(200).json({
    supabaseUrl,
    supabaseAnonKey
  });
};
