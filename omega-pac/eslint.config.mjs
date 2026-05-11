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
      // regex-heavy codebase — escaping inside character classes is readability
      "no-useless-escape": "off",
      // chai assertions use standalone expressions (e.g. chai.should())
      "no-unused-expressions": "off",
      "@typescript-eslint/no-unused-expressions": "off",
      // lexical declarations in case blocks without braces — stylistic only
      "no-case-declarations": "off",
      // Allow Function type where needed
      "@typescript-eslint/no-unsafe-function-type": "off",
      // needs tsconfig strictNullChecks: true; informational only with strict:false
      "@typescript-eslint/prefer-nullish-coalescing": "off",
      // omega-pac has strict: false — allow gradual typing
      "@typescript-eslint/no-explicit-any": "off",
    },
  },

  // ---- Source files (strict ES2025) ----
  {
    files: ["src/**/*.ts"],
    rules: {
      // --- Prefer ES2025+ built-ins ---
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
      "@typescript-eslint/prefer-includes": "warn",
      "@typescript-eslint/prefer-string-starts-ends-with": "warn",
      "@typescript-eslint/no-unnecessary-type-assertion": "warn",
      "@typescript-eslint/prefer-for-of": "warn",
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

  // ---- Config files ----
  {
    files: ["*.config.*"],
    rules: {
      "no-var": "off",
    },
  },

  // ---- Global ignores ----
  {
    ignores: ["dist/", "node_modules/", "*.js", "*.min.js"],
  },
);
