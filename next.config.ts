import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    cacheComponents: true,

    // Disable ONLY if nginx has enabled brotli
    // compress: false,

    experimental: {
        cssChunking: true,
        browserDebugInfoInTerminal: true,
        viewTransition: true,
    },

    images: {
        // Enable only if CPU does not support popcnt
        unoptimized: true,
    },

    reactCompiler: true,
};

export default nextConfig;
