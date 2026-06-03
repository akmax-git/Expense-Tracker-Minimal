const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");
const fs = require("fs");

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

// On Vercel the repo is cloned flat and npm installs only into
// artifacts/mobile/node_modules, so Metro can't traverse up to
// the (non-existent) repo-root node_modules.
// In the Replit monorepo the root node_modules exists and Metro
// needs it to resolve pnpm workspace symlinks.
// So we only restrict resolution when running in Vercel OR when
// the root node_modules directory genuinely does not exist.
const rootNodeModules = path.resolve(projectRoot, "../../node_modules");
const isVercel = !!process.env.VERCEL;
const rootExists = fs.existsSync(rootNodeModules);

if (isVercel || !rootExists) {
  config.resolver.nodeModulesPaths = [
    path.resolve(projectRoot, "node_modules"),
  ];
  config.watchFolders = [projectRoot];
}

module.exports = config;
