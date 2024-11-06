require("dotenv").config();
const { execSync } = require("child_process");

if (!process.env.GH_TOKEN) {
  console.error("Error: GH_TOKEN not found in environment variables");
  process.exit(1);
}

try {
  console.log("Creating release...");
  execSync("electron-builder --publish always", {
    stdio: "inherit",
    env: {
      ...process.env,
      GH_TOKEN: process.env.GH_TOKEN,
      DEBUG: "electron-builder",
    },
  });

  // Get package version
  const pkg = require("../package.json");
  const version = pkg.version;
  const repoUrl = pkg.repository.url.replace("git+", "").replace(".git", "");

  console.log("\n✨ Release published successfully!");
  console.log(`\nDownload URL: ${repoUrl}/releases/tag/v${version}`);
  console.log(`Release page: ${repoUrl}/releases/latest`);
} catch (error) {
  console.error("Error during publish:", error);
  process.exit(1);
}
