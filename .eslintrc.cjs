module.exports = {
  root: true,
  ignorePatterns: ["**/node_modules/*", "**/.next/*", "**/dist/*", "backend/*"],
  extends: ["eslint:recommended"],
  env: {
    es2021: true,
    browser: true,
    node: true,
  },
};
