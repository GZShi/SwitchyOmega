const TerserPlugin = require('terser-webpack-plugin');
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');

const isProduction = process.env.BUILD === 'release';

// CommonJS build for workspace-internal use and testing
const commonjsConfig = {
  mode: isProduction ? 'production' : 'development',
  entry: './index.coffee',
  target: 'node',
  output: {
    path: __dirname,
    filename: 'index.js',
    library: { type: 'commonjs2' },
  },
  resolve: {
    extensions: ['.coffee', '.js'],
  },
  module: {
    rules: [
      { test: /\.coffee$/, use: 'coffee-loader' },
    ],
  },
  externals: {
    'bluebird': 'commonjs bluebird',
    'jsondiffpatch': 'commonjs jsondiffpatch',
    'omega-pac': 'commonjs omega-pac',
    'limiter': 'commonjs limiter',
  },
  devtool: false,
};

// UMD standalone build for browser extension
const umdConfig = {
  mode: isProduction ? 'production' : 'development',
  entry: './index.coffee',
  target: 'web',
  output: {
    path: __dirname,
    filename: 'omega_target.min.js',
    library: {
      name: 'OmegaTarget',
      type: 'umd',
    },
  },
  resolve: {
    extensions: ['.coffee', '.js'],
    fallback: { fs: false, path: false },
  },
  module: {
    rules: [
      { test: /\.coffee$/, use: 'coffee-loader' },
    ],
  },
  externals: {
    'omega-pac': {
      root: 'OmegaPac',
      commonjs: 'omega-pac',
      commonjs2: 'omega-pac',
    },
  },
  plugins: [new NodePolyfillPlugin()],
  optimization: {
    minimize: isProduction,
    minimizer: [new TerserPlugin({ extractComments: false })],
  },
  devtool: false,
};

module.exports = [commonjsConfig, umdConfig];
