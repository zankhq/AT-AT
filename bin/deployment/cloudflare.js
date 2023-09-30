import { execSync } from "child_process";
import { packageManagerCommands } from "../utils/pkg.js";
import { ensureConnectedToGitHub } from "../vcs/github.js";
import { log } from "../utils/log.js";

/**
 * Ensures that the wrangler CLI is installed globally.
 * If it's not installed, it will be installed using the selected package manager.
 * @param {string} selectedPackageManager - The selected package manager.
 * @returns {void}
 */
function ensureWranglerCLI(selectedPackageManager) {
	// We assume that if `pnpm list -g wrangler` command doesn't throw an error, then wrangler is installed.
	if (!isCommandAvailable(`${packageManagerCommands[selectedPackageManager].list} -g wrangler`)) {
		log.info(`wrangler is not installed. Installing using ${selectedPackageManager}...`);
		execSync(`${packageManagerCommands[selectedPackageManager].globalAdd} wrangler`, { stdio: "inherit" });
		log.info("wrangler installed successfully.");
	} else {
		log.info("wrangler is already installed.");
	}
}

/**
 * Deploys a package to Cloudflare pages.
 * @param {string} selectedPackageManager - The selected package manager.
 * @param {string} packageName - The name of the package to deploy.
 * @param {string} destination - The destination directory to deploy to.
 * @returns {void}
 */
async function deployToCloudflare(selectedPackageManager, packageName, destination) {
	log.info("Deploying to Cloudflare pages...");

	// Ensure that wrangler is installed
	ensureWranglerCLI();

	// Ensure the directory is connected to GitHub
	const isGitHubConnected = await ensureConnectedToGitHub(packageName, destination); // This function now might return a boolean value.

	// Check the GitHub connection status and decide the deployment strategy
	log.info(`Starting cloudflare pages deployment, it could take some seconds.`);

	if (isGitHubConnected) {
		// Connected to GitHub, so setup continuous deployment
		try {
			execSync(`wrangler pages project create ${packageName}`, { stdio: "inherit" });
			log.info("Cloudflare pages project set up successfully.");
		} catch (error) {
			log.error("Failed to set up continuous deployment to Cloudflare pages:", error.message);
		}
	} else {
		// Not connected to GitHub, do a manual deploy
		try {
			log.info(`Starting packages installation and build on ${destination}`);
			execSync(`${packageManagerCommands[selectedPackageManager].install}`, { stdio: "inherit", cwd: destination });
			execSync(`${packageManagerCommands[selectedPackageManager].build}`, { stdio: "inherit", cwd: destination });
			log.info(`Installation and build completed successfully. Starting netlify deployment...`);

			execSync(`wrangler pages deploy dist`, { stdio: "inherit", cwd: destination });
			log.info("Deployment to Cloudflare pages completed successfully.");
		} catch (error) {
			log.error("Failed to deploy to Cloudflare pages:", error.message);
		}
	}
}

export { ensureWranglerCLI, deployToCloudflare };
