export default function handler(_req: any, res: any) {
  res.status(200).json({
    ok: true,
    env: {
      VITE_SUPABASE_URL: Boolean(process.env.VITE_SUPABASE_URL),
      VITE_SUPABASE_PUBLISHABLE_KEY: Boolean(process.env.VITE_SUPABASE_PUBLISHABLE_KEY),
      SUPABASE_URL: Boolean(process.env.SUPABASE_URL),
      SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      AUTH_EMAIL_ADDRESS: Boolean(process.env.AUTH_EMAIL_ADDRESS),
      AUTH_EMAIL_APP_PASSWORD: Boolean(process.env.AUTH_EMAIL_APP_PASSWORD),
      VERIFICATION_PEPPER: Boolean(process.env.VERIFICATION_PEPPER)
    }
  });
}
