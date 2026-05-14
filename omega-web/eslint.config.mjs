import js from "@eslint/js";
import ts from "typescript-eslint";
import prettier from "eslint-config-prettier";
import pluginVue from "eslint-plugin-vue";

export default ts.config(
  js.configs.recommended,
  ...ts.configs.recommended,
  prettier,
  ...pluginVue.configs["flat/recommended"],

  {
    languageOptions: {
      ecmaVersion: 2025,
      sourceType: "module",
      parserOptions: {
        parser: ts.parser,
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: [".vue"],
      },
    },
  },

  // ---- Global overrides ----
  {
    rules: {
      // Allow _prefixed unused vars (intentional discards)
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // Allow Function type where needed
      "@typescript-eslint/no-unsafe-function-type": "off",
      // Allow explicit any (gradual typing)
      "@typescript-eslint/no-explicit-any": "off",
      // this project uses window globals from extension host
      "no-undef": "off",
    },
  },

  // ---- Source files (.ts / .vue) ----
  {
    files: ["src/**/*.ts", "src/**/*.vue"],
    rules: {
      // --- Prefer ES2022+ built-ins ---
      "no-var": "error",
      "prefer-const": "error",
      "prefer-template": "warn",
      "prefer-arrow-callback": "warn",
      "object-shorthand": "warn",
      "prefer-object-spread": "warn",
      "prefer-spread": "warn",
      "prefer-exponentiation-operator": "warn",
      "no-useless-call": "error",
      "no-prototype-builtins": "warn",
      "no-useless-concat": "warn",

      // off — requires changing method signatures (arguments → ...args)
      "prefer-rest-params": "off",

      // --- Deprecated APIs ---
      "no-restricted-syntax": [
        "warn",
        {
          selector:
            "CallExpression[callee.property.name='substr']",
          message:
            "Use String.prototype.slice() or startsWith() instead of deprecated substr().",
        },
      ],

      // --- TypeScript modern patterns ---
      "@typescript-eslint/prefer-optional-chain": "warn",
      "@typescript-eslint/prefer-nullish-coalescing": "warn",
      "@typescript-eslint/prefer-includes": "warn",
      "@typescript-eslint/prefer-string-starts-ends-with": "warn",
      "@typescript-eslint/no-unnecessary-type-assertion": "warn",
      "@typescript-eslint/prefer-for-of": "warn",

      "no-console": "warn",

      // --- Vue overrides ---
      // Allow single-word component names (existing convention)
      "vue/multi-word-component-names": "off",
      // All v-html usages render trusted i18n strings from the extension's own locale files
      "vue/no-v-html": "off",
    },
  },

  // ---- Config files (vite, tsconfig scripts) ----
  {
    files: ["*.config.*"],
    rules: {
      "no-var": "off",
    },
  },

  // ---- Global ignores ----
  {
    ignores: [
      "build/",
      "dist/",
      "node_modules/",
      "lib/",
      "scripts/",
      "src/options/guides/",
    ],
  },
);
