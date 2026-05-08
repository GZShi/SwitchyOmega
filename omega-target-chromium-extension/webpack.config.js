const path = require("path");
const TerserPlugin = require("terser-webpack-plugin");
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin");

const isProduction = process.env.BUILD === "release";

const tsRule = {
  test: /\.ts$/,
  use: {
    loader: "ts-loader",
    options: {
      transpileOnly: true,
      compilerOptions: { target: "ES5", module: "commonjs" },
    },
  },
};

// CommonJS build for workspace-internal use
const commonjsConfig = {
  mode: isProduction ? "production" : "development",
  entry: "./index.ts",
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
    "omega-pac": "commonjs omega-pac",
    "omega-target": "commonjs omega-target",
    "omega-web": "commonjs omega-web",
    "heap-js": "commonjs heap-js",
  },
  devtool: false,
};

// UMD standalone build for browser extension
const umdConfig = {
  mode: isProduction ? "production" : "development",
  entry: "./index.ts",
  target: "web",
  output: {
    path: path.join(__dirname, "build", "js"),
    filename: "omega_target_chromium_extension.min.js",
    library: {
      name: "OmegaTargetChromium",
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
      amd: "omega-pac",
    },
    "omega-target": {
      root: "OmegaTarget",
      commonjs: "omega-target",
      commonjs2: "omega-target",
      amd: "omega-target",
    },
  },
  plugins: [new NodePolyfillPlugin()],
  optimization: {
    minimize: isProduction,
    minimizer: [new TerserPlugin({ extractComments: false })],
  },
  devtool: false,
};

// Proxy script for Firefox WebExtension
const omegaPacBundle = path.resolve(
  __dirname,
  "node_modules",
  "omega-pac",
  "omega_pac.min.js",
);

const proxyScriptConfig = {
  mode: isProduction ? "production" : "development",
  entry: "./src/js/omega_webext_proxy_script.js",
  target: "web",
  output: {
    path: path.join(__dirname, "build", "js"),
    filename: "omega_webext_proxy_script.min.js",
  },
  resolve: {
    alias: { "omega-pac": omegaPacBundle },
  },
  module: {
    noParse: [omegaPacBundle],
    rules: [],
  },
  optimization: {
    minimize: isProduction,
    minimizer: [new TerserPlugin({ extractComments: false })],
  },
  devtool: false,
};

module.exports = [commonjsConfig, umdConfig, proxyScriptConfig];
