/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Mengizinkan build tetap lanjut meskipun ada error linting
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Mengizinkan build tetap lanjut meskipun ada error type (TS)
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
