import path from 'node:path';
import type { NextConfig } from 'next';

// GitHub Pages: `GITHUB_PAGES=true` builds a static export under /<repo>/ (set by .github/workflows/pages.yml).
const pages = process.env.GITHUB_PAGES === 'true';
const basePath = pages ? process.env.PAGES_BASE_PATH ?? '/3D-city-cinematic' : '';

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_CITY_DEBUG: '', NEXT_PUBLIC_BASE_PATH: basePath },
  ...(pages && { output: 'export', basePath }),
  trailingSlash: true,
  turbopack: { root: path.join(__dirname) },
  images: { unoptimized: true },
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
};

export default nextConfig;
