/** @type {import('next').NextConfig} */
const nextConfig = {
  // Serve runtime uploads (`public/uploads/*`) through a route handler so they
  // are available in both `next dev` and `next start`. `next start` snapshots
  // the static `public/` manifest at boot, so files written after boot are not
  // served statically; `beforeFiles` sends every `/uploads/*` request to the
  // handler instead. See app/api/media/[...path]/route.ts.
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/uploads/:path*", destination: "/api/media/:path*" },
      ],
    };
  },
};

export default nextConfig;
