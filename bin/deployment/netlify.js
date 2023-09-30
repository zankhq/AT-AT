import { promises as fs } from "fs";
import path from "path";
import { execSync } from "child_process";
import { log } from "../utils/log.js";
import { packageManagerCommands } from "../utils/pkg.js";
import { deleteDirectoryRecursive } from "../utils/fileUtils.js";
import { ensureConnectedToGitHub } from "../vcs/github.js";
import { isCommandAvailable } from "../utils/pkg.js";

/**
 * Ensures that the netlify-cli package is installed using the selected package manager.
 */
function ensureNetlifyCLI(selectedPackageManager) {
	// We assume that if `pnpm list -g netlify-cli` command doesn't throw an error, then netlify-cli is installed.
	if (!isCommandAvailable(`${packageManagerCommands[selectedPackageManager].list} -g netlify-cli`)) {
		log.info(`netlify-cli is not installed. Installing using ${selectedPackageManager}...`);
		execSync(`${packageManagerCommands[selectedPackageManager].globalAdd} netlify-cli`, { stdio: "inherit" });
		log.info("netlify-cli installed successfully.");
	} else {
		log.info("netlify-cli is already installed.");
	}
}

/**
 * Generates a netlify.toml file at the specified destination path.
 *
 * @param {string} destination - The path where the netlify.toml file should be generated.
 */
async function generateNetlifyToml(selectedPackageManager, destination) {
	const tomlContent = `
[build]
  command = "${packageManagerCommands[selectedPackageManager].build}"
  functions = "netlify/functions"
  publish = "dist"
[build.environment]
  PNPM_FLAGS = "--no-frozen-lockfile"
  YARN_FLAGS = "--ignore-engines --no-lockfile"
  NPM_FLAGS = "--no-package-lock"
`;

	const tomlPath = path.join(destination, "netlify.toml");
	await fs.writeFile(tomlPath, tomlContent.trim() + "\n");
	log.info(`Generated 'netlify.toml' at ${tomlPath}`);
}

/**
 * Deploys the project to Netlify.
 * @param {string} destination - The path to the directory where the project will be deployed.
 * @returns {void}
 */
async function deployToNetlify(selectedPackageManager, packageName, destination) {
	log.info("Deploying to Netlify...");

	await generateNetlifyToml(selectedPackageManager, destination);

	// Remove the functions folder
	log.info(`Removing 'functions' directory from ${destination} as is only needed for cloudflare pages.`);
	const functionsDir = path.join(destination, "functions");
	try {
		await deleteDirectoryRecursive(functionsDir);
	} catch (ex) {
		log.error(`Failed to remove 'functions' directory from ${destination}: ${ex.message}`);
	}

	log.info(`Making sure that netlify cli is installed.`);
	// Ensure that netlify-cli is installed
	ensureNetlifyCLI(selectedPackageManager);

	// Ensure the directory is connected to GitHub
	log.info(`Check github connection and create github repo if needed.`);
	const isGitHubConnected = await ensureConnectedToGitHub(packageName, destination); // This function now might return a boolean value.

	// Check the GitHub connection status and decide the deployment strategy
	log.info(`Starting netlify deployment, it could take some seconds.`);

	if (isGitHubConnected) {
		// Connected to GitHub, so setup continuous deployment
		try {
			execSync("netlify init", { stdio: "inherit", cwd: destination });
			log.info("Continuous deployment to Netlify set up successfully.");
		} catch (error) {
			log.error("Failed to set up continuous deployment to Netlify:", error.message);
		}
	} else {
		// Not connected to GitHub, do a manual deploy
		try {
			log.info(`Starting packages installation and build on ${destination}`);
			execSync(`${packageManagerCommands[selectedPackageManager].install}`, { stdio: "inherit", cwd: destination });
			execSync(`${packageManagerCommands[selectedPackageManager].build}`, { stdio: "inherit", cwd: destination });
			log.info(`Installation and build completed successfully. Starting netlify deployment...`);

			execSync("netlify deploy --prod", { stdio: "inherit", cwd: destination });
			log.info("Deployment to Netlify completed successfully.");
		} catch (error) {
			log.error("Failed to deploy to Netlify:", error.message);
		}
	}

	// Update HOSTING_SERVICE value in the src/consts.ts file
	const constsFilePath = path.join(destination, "src", "consts.ts");
	const content = await fs.readFile(constsFilePath, "utf8");
	const updatedContent = content.replace(
		/export const HOSTING_SERVICE: "cloudflare" \| "netlify" \| "none" = "[^"]+";/,
		`export const HOSTING_SERVICE: "cloudflare" | "netlify" | "none" = "netlify";`,
	);
	await fs.writeFile(constsFilePath, updatedContent, "utf8");
	log.info("Updated HOSTING_SERVICE value to 'netlify' in src/consts.ts");
}

export { ensureNetlifyCLI, generateNetlifyToml, deployToNetlify };
