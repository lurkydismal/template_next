import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    cacheComponents: true,

    logging: {
        browserDebugInfoInTerminal: true,
    },

    // Disable ONLY if nginx has enabled brotli
    // compress: false,

    experimental: {
        cssChunking: true,
        authInterrupts: true,
    },

    images: {
        // Enable only if CPU does not support popcnt
        unoptimized: true,
    },

    reactCompiler: true,
};

export default nextConfig;
