/** @type {import('next').NextConfig} */
const nextConfig = {
  // transformers.js (CLIP vector service) pulls in native Node addons —
  // onnxruntime-node ships prebuilt `.node` binaries and sharp is a native
  // image library. Keep them out of the webpack/Turbopack server bundle so they
  // are `require`d from node_modules at runtime instead of being (incorrectly)
  // bundled. Required for `lib/clip.ts` to run on the Node.js runtime.
  serverExternalPackages: ["@xenova/transformers", "onnxruntime-node", "sharp"],
};

export default nextConfig;
