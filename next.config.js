/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Prevent @huggingface/transformers from being bundled on the server —
  // it is a browser-only package and uses import.meta / WASM which Node cannot process.
  serverExternalPackages: ['@huggingface/transformers', 'onnxruntime-web'],
  experimental: {
    typedRoutes: true,
    optimizePackageImports: ['@apollo/client', 'date-fns'],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Optimize production output
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
  compress: true,
  // Reduce JavaScript execution time
  modularizeImports: {
    '@apollo/client': {
      transform: '@apollo/client/{{member}}',
    },
  },
  // Allow @huggingface/transformers WASM and large model files
  webpack(config) {
    // onnxruntime-web (a dependency of @huggingface/transformers) ships ESM bundles
    // that use `import.meta`. Webpack 5 must be told these are ESM (javascript/auto)
    // so it does not reject import.meta as invalid CJS syntax.
    config.module.rules.push({
      test: /\.m?js$/,
      include: /node_modules\/(onnxruntime-web|@huggingface\/transformers)/,
      type: 'javascript/auto',
      resolve: { fullySpecified: false },
    });

    // Enable async WebAssembly so .wasm files loaded by onnxruntime-web can be
    // imported as async modules rather than static assets.
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    config.resolve.alias = {
      ...config.resolve.alias,
      sharp$: false,
      'onnxruntime-node$': false,
    };
    return config;
  },
  async headers() {
    // Development headers - allow Simple Browser iframe
    if (process.env.NODE_ENV !== 'production') {
      return [
        {
          source: '/:path*',
          headers: [
            {
              key: 'Content-Security-Policy',
              value:
                "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' data: blob: ws: wss: https://huggingface.co https://cdn-lfs.huggingface.co https://cdn-lfs-us-1.huggingface.co https://*.xethub.hf.co https://*.hf.co https://cdn.jsdelivr.net; worker-src 'self' blob:; base-uri 'self'; form-action 'self';",
            },
            {
              key: 'X-Frame-Options',
              value: 'ALLOWALL',
            },
            {
              key: 'X-Content-Type-Options',
              value: 'nosniff',
            },
            {
              key: 'Referrer-Policy',
              value: 'strict-origin-when-cross-origin',
            },
            {
              key: 'Permissions-Policy',
              value: 'camera=(), microphone=(), geolocation=()',
            },
          ],
        },
      ];
    }

    // Production headers - strict security
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' data: blob: https://huggingface.co https://cdn-lfs.huggingface.co https://cdn-lfs-us-1.huggingface.co https://*.xethub.hf.co https://*.hf.co https://cdn.jsdelivr.net; worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self';",
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
