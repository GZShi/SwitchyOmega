const path = require("path");
const TerserPlugin = require("terser-webpack-plugin");
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin");

const isProduction = process.env.BUILD === "release";

// CommonJS build for workspace-internal use
const commonjsConfig = {
  mode: isProduction ? "production" : "development",
  entry: "./index.coffee",
  target: "node",
  output: {
    path: __dirname,
    filename: "index.js",
    library: { type: "commonjs2" },
  },
  resolve: {
    extensions: [".coffee", ".js"],
  },
  module: {
    rules: [{ test: /\.coffee$/, use: "coffee-loader" }],
  },
  externals: {
    "uglify-js": "commonjs uglify-js",
    "ip-address": "commonjs ip-address",
  },
  devtool: false,
};

// UMD standalone build for browser extension.
// uglify-js is BUNDLED (not externalized) via the shim, matching
// the original Browserify behavior where the browser entry had no exclude.
const umdConfig = {
  mode: isProduction ? "production" : "development",
  entry: "./index.coffee",
  target: "web",
  output: {
    path: __dirname,
    filename: "omega_pac.min.js",
    library: {
      name: "OmegaPac",
      type: "umd",
      umdNamedDefine: true,
    },
  },
  resolve: {
    extensions: [".coffee", ".js"],
    alias: {
      "uglify-js": path.resolve(__dirname, "uglifyjs-shim.js"),
      "uglify-js-real": path.resolve(__dirname, "uglifyjs.js"),
    },
    fallback: { fs: false, path: false },
  },
  module: {
    rules: [{ test: /\.coffee$/, use: "coffee-loader" }],
  },
  plugins: [new NodePolyfillPlugin()],
  optimization: {
    minimize: isProduction,
    minimizer: [new TerserPlugin({ extractComments: false })],
  },
  devtool: false,
};

module.exports = [commonjsConfig, umdConfig];
