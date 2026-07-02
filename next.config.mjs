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
  // transformers.js (CLIP vector service) pulls in native Node addons —
  // onnxruntime-node ships prebuilt `.node` binaries and sharp is a native
  // image library. Keep them out of the webpack/Turbopack server bundle so they
  // are `require`d from node_modules at runtime instead of being (incorrectly)
  // bundled. Required for `lib/clip.ts` to run on the Node.js runtime.
  serverExternalPackages: ["@xenova/transformers", "onnxruntime-node", "sharp"],
};

export default nextConfig;
