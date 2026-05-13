import js from "@eslint/js";
import ts from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default ts.config(
  js.configs.recommended,
  ...ts.configs.recommended,
  prettier,

  {
    languageOptions: {
      ecmaVersion: 2025,
      sourceType: "module",
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // ---- Global overrides ----
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-unsafe-function-type": "off",
      "@typescript-eslint/no-explicit-any": "off",
      // Source still uses CJS `require()` extensively — allow during
      // gradual modernization to ES module syntax.
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unused-expressions": "off",
      "no-useless-assignment": "off",
      "no-case-declarations": "off",
      "no-extra-boolean-cast": "off",
      "prefer-const": "warn",
    },
  },

  // ---- Source files ----
  {
    files: ["src/**/*.ts"],
    rules: {
      "no-var": "error",
      "prefer-template": "warn",
      "prefer-arrow-callback": "warn",
      "object-shorthand": "warn",
      "prefer-object-spread": "warn",
      "prefer-rest-params": "off",
      "prefer-spread": "warn",
      "prefer-exponentiation-operator": "warn",
      "no-useless-call": "error",
      "no-prototype-builtins": "warn",
      "no-useless-concat": "warn",

      "no-restricted-syntax": [
        "warn",
        {
          selector:
            "CallExpression[callee.property.name='substr']",
          message:
            "Use String.prototype.slice() or startsWith() instead of deprecated substr().",
        },
        {
          selector:
            "CallExpression[callee.property.name='substring']",
          message: "Prefer String.prototype.slice() over substring().",
        },
      ],

      "@typescript-eslint/prefer-optional-chain": "warn",
      "@typescript-eslint/prefer-nullish-coalescing": "warn",
      "@typescript-eslint/prefer-includes": "warn",
      "@typescript-eslint/prefer-string-starts-ends-with": "warn",
      "@typescript-eslint/no-unnecessary-type-assertion": "warn",
      "@typescript-eslint/prefer-for-of": "warn",

      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
    },
  },

  // ---- Standalone scripts (background/popup, compiled with --module none) ----
  {
    files: ["src/background/**/*.ts", "src/popup/**/*.ts"],
    rules: {
      "no-var": "off",
      "prefer-const": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },

  // ---- Config / scripts ----
  {
    files: ["*.config.*", "scripts/**"],
    rules: {
      "no-var": "off",
    },
  },

  // ---- Global ignores ----
  {
    ignores: [
      "dist/",
      "build/",
      "node_modules/",
      "*.js",
      "src/popup/**/*.js",
      "src/proxy/**/*.js",
      "overlay/",
    ],
  },
);
