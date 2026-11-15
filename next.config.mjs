const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      // Local Supabase (`npx supabase start`) serves uploads over plain http.
      { protocol: "http", hostname: "localhost" },
      { protocol: "http", hostname: "127.0.0.1" }
    ],
    // The demo catalogue and default logo are SVGs. Serve them as images only, with scripts disabled.
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;"
  }
};

export default nextConfig;
