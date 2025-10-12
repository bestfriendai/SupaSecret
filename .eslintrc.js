module.exports = {
  extends: ["expo", "prettier"],
  plugins: ["prettier"],
  ignorePatterns: ["/dist/*", "rootStore.example.ts", "nativewind-env.d.ts"],
  rules: {
    "prettier/prettier": "error",
    "import/first": "off",
    // Disable import resolution errors - TypeScript handles this
    "import/no-unresolved": "off",
    // Allow unused vars with underscore prefix
    "@typescript-eslint/no-unused-vars": [
      "warn",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      },
    ],
  },
};
