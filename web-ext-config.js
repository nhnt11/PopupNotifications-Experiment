/* eslint-env node */

const defaultConfig = {
  // Global options:
  sourceDir: "./src/",
  artifactsDir: "./dist/",
  ignoreFiles: [".DS_Store"],
  // Command options:
  build: {
    overwriteDest: true,
  },
  run: {
    firefox: process.env.FIREFOX_BINARY || "firefox",
    browserConsole: false,
    startUrl: ["vodafone.de"],
    pref: ["extensions.pnexperiment.enabled=true",
      "browser.translation.detectLanguage=true"],
  },
};

module.exports = defaultConfig;
