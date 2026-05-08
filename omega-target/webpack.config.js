const TerserPlugin = require("terser-webpack-plugin");
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin");

const isProduction = process.env.BUILD === "release";

const tsRule = {
  test: /\.ts$/,
  use: {
    loader: "ts-loader",
    options: {
      transpileOnly: true,
      compilerOptions: {
        target: "ES5",
        module: "commonjs",
      },
    },
  },
};

// CommonJS build for workspace-internal use and testing
const commonjsConfig = {
  mode: isProduction ? "production" : "development",
  entry: "./src/index.ts",
  target: "node",
  output: {
    path: __dirname,
    filename: "index.js",
    library: { type: "commonjs2" },
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  module: {
    rules: [tsRule],
  },
  externals: {
    jsondiffpatch: "commonjs jsondiffpatch",
    "omega-pac": "commonjs omega-pac",
    limiter: "commonjs limiter",
  },
  devtool: false,
};

// UMD standalone build for browser extension
const umdConfig = {
  mode: isProduction ? "production" : "development",
  entry: "./src/index.ts",
  target: "web",
  output: {
    path: __dirname,
    filename: "omega_target.min.js",
    library: {
      name: "OmegaTarget",
      type: "umd",
    },
  },
  resolve: {
    extensions: [".ts", ".js"],
    fallback: { fs: false, path: false },
  },
  module: {
    rules: [tsRule],
  },
  externals: {
    "omega-pac": {
      root: "OmegaPac",
      commonjs: "omega-pac",
      commonjs2: "omega-pac",
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
