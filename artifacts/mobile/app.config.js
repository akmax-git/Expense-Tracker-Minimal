/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  name: "Lifeeasy",
  slug: "lifeeasy",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "lifeeasy",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  splash: {
    image: "./assets/images/icon.png",
    resizeMode: "contain",
    backgroundColor: "#09090E",
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.lifeeasy.app",
  },
  android: {
    package: "com.lifeeasy.app",
  },
  web: {
    favicon: "./assets/images/icon.png",
    bundler: "metro",
    output: "static",
  },
  plugins: [
    [
      "expo-router",
      {
        origin:
          process.env.EXPO_PUBLIC_DOMAIN
            ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
            : "https://lifeeasy.vercel.app",
      },
    ],
    "expo-font",
    "expo-web-browser",
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};
