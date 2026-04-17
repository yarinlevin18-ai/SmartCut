import { createBrowserClient } from "@supabase/ssr";

/**
 * createClientBrowser() — For use in client components
 * Browser-safe Supabase client (uses anon key only)
 */
export const createClientBrowser = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing Supabase environment variables. Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env.local. If you just created .env.local, restart the dev server."
    );
  }

  return createBrowserClient(url, key);
};
