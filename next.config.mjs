/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  async redirects() {
    return [{ source: '/', destination: '/he-IL', permanent: true }];
  },
};
export default nextConfig;
