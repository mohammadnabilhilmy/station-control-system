/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // Mengabaikan ESLint dengan cara yang benar di versi terbaru
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
