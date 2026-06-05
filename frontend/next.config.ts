import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['pixi-live2d-display', '@pixi/core', '@pixi/display'],
  turbopack: {
    resolveAlias: {
      '@pixi/core': './node_modules/@pixi/core',
      '@pixi/display': './node_modules/@pixi/display',
    },
  },
  webpack: (config) => {
    config.resolve ??= {}
    config.resolve.alias = {
      ...config.resolve.alias,
      '@pixi/core': require.resolve('@pixi/core'),
      '@pixi/display': require.resolve('@pixi/display'),
    }
    return config
  },
}

export default nextConfig
