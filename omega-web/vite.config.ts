import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  build: {
    outDir: "build",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: "js/[name].js",
        chunkFileNames: "js/[name].js",
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith(".css")) {
            return "css/[name].css";
          }
          return "[name].[ext]";
        },
      },
      input: {
        options: resolve(__dirname, "src/options.html"),
        "popup/index": resolve(__dirname, "src/popup/index.html"),
        options_guide: resolve(__dirname, "src/guides/options_guide.ts"),
        switch_profile_guide: resolve(
          __dirname,
          "src/guides/switch_profile_guide.ts",
        ),
      },
    },
  },
  css: {
    preprocessorOptions: {
      less: {
        paths: [resolve(__dirname, "src/less")],
      },
    },
  },
});
