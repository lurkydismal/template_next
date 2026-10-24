import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    cacheComponents: true,
    partialPrefetching: true,

    logging: {
        browserToTerminal: true,
    },

    // Disable ONLY if nginx has enabled brotli
    // compress: false,

    experimental: {
        cssChunking: true,
        authInterrupts: true,
        // Use the Rust port instead of the Babel transform
        turbopackRustReactCompiler: true,
        useOffline: true,
    },

    images: {
        // Enable only if CPU does not support popcnt
        unoptimized: true,
    },

    reactCompiler: true,
};

export default nextConfig;
