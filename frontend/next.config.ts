import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Required for snarkjs and cofhejs WASM support
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
      topLevelAwait: true,
    };

    // Set module ids for better caching
    config.optimization.moduleIds = "named";

    // Handle WASM files
    config.module.rules.push({
      test: /\.wasm$/,
      type: "asset/resource",
    });

    // Handle snarkjs and cofhejs dependencies
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        readline: false,
        path: false,
        crypto: false,
      };

      // Set output environment for async functions
      config.output.environment = {
        ...config.output.environment,
        asyncFunction: true,
      };

      // Set WASM module filename for client-side
      config.output.webassemblyModuleFilename = "static/wasm/[modulehash].wasm";
    } else {
      // Set WASM module filename for server-side
      config.output.webassemblyModuleFilename = "./../static/wasm/[modulehash].wasm";
    }

    // Handle optional peer dependencies that may not be installed
    config.resolve.alias = {
      ...config.resolve.alias,
      "@gemini-wallet/core": false,
      porto: false,
      "@react-native-async-storage/async-storage": false,
    };

    return config;
  },
};

export default nextConfig;
