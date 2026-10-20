/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@opm/shared-types'],
  // The e2e suite builds into its own directory so it never clobbers a running dev server.
  distDir: process.env.NEXT_DIST_DIR || '.next',
};
export default nextConfig;
