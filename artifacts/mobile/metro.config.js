const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

// Tell Metro to ONLY look in this directory's node_modules.
// Without this, Metro traverses up to the repo root looking for
// node_modules, which breaks on Vercel where packages are installed
// only inside artifacts/mobile/.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
];

// Watch only the current project folder — not the monorepo root.
config.watchFolders = [projectRoot];

module.exports = config;
