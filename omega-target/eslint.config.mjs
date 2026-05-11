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
      // Allow _prefixed unused vars (intentional discards)
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // Allow Function type (existing public API shape)
      "@typescript-eslint/no-unsafe-function-type": "off",
      // Allow explicit any (gradual typing in a codebase undergoing modernization)
      "@typescript-eslint/no-explicit-any": "off",
    },
  },

  // ---- Source files (strict ES2022) ----
  {
    files: ["src/**/*.ts"],
    rules: {
      // --- Prefer ES2022+ built-ins ---
      "no-var": "error",
      "prefer-const": "error",
      "prefer-template": "warn",
      "prefer-arrow-callback": "warn",
      "object-shorthand": "warn",
      "prefer-object-spread": "warn",
      // off — requires changing 15 method signatures (arguments → ...args)
      "prefer-rest-params": "off",
      "prefer-spread": "warn",
      "prefer-exponentiation-operator": "warn",
      "no-useless-call": "error",
      "no-prototype-builtins": "warn",
      "no-useless-concat": "warn",

      // --- Deprecated APIs ---
      "no-restricted-syntax": [
        "warn",
        {
          selector: "CallExpression[callee.property.name='substr']",
          message: "Use String.prototype.slice() or startsWith() instead of deprecated substr().",
        },
        {
          selector: "CallExpression[callee.property.name='substring']",
          message: "Prefer String.prototype.slice() over substring().",
        },
      ],

      // --- TypeScript modern patterns ---
      "@typescript-eslint/prefer-optional-chain": "warn",
      "@typescript-eslint/prefer-nullish-coalescing": "warn",
      "@typescript-eslint/prefer-includes": "warn",
      "@typescript-eslint/prefer-string-starts-ends-with": "warn",
      "@typescript-eslint/no-unnecessary-type-assertion": "warn",
      "@typescript-eslint/prefer-for-of": "warn",

      // --- Broad unsafe-* rules off during gradual modernization ---
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
    },
  },

  // ---- Test files (very loose, no type-aware linting) ----
  {
    files: ["test/**/*.ts"],
    languageOptions: {
      parserOptions: { projectService: false },
    },
    rules: {
      "@typescript-eslint/no-unused-expressions": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "no-var": "off",
      "prefer-rest-params": "off",
      "prefer-const": "off",
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
    ignores: ["dist/", "node_modules/", "*.js", "omega_target.min.js"],
  },
);
