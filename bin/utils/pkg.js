import { execSync } from "child_process";
import { log } from "../utils/log.js";

/**
 * Object containing commands for various package managers.
 * @typedef {Object} PackageManagerCommands
 * @property {Object} npm - Commands for npm package manager.
 * @property {string} npm.install - Command to install packages using npm.
 * @property {string} npm.run - Command to run scripts using npm.
 * @property {string} npm.build - Command to build project using npm.
 * @property {string} npm.dev - Command to run development server using npm.
 * @property {string} npm.list - Command to list installed packages using npm.
 * @property {string} npm.globalAdd - Command to install packages globally using npm.
 * @property {string} npm.globalList - Command to list globally installed packages using npm.
 * @property {string} npm.remove - Command to remove packages using npm.
 * @property {Object} pnpm - Commands for pnpm package manager.
 * @property {string} pnpm.install - Command to install packages using pnpm.
 * @property {string} pnpm.run - Command to run scripts using pnpm.
 * @property {string} pnpm.build - Command to build project using pnpm.
 * @property {string} pnpm.dev - Command to run development server using pnpm.
 * @property {string} pnpm.list - Command to list installed packages using pnpm.
 * @property {string} pnpm.globalAdd - Command to install packages globally using pnpm.
 * @property {string} pnpm.globalList - Command to list globally installed packages using pnpm.
 * @property {string} pnpm.remove - Command to remove packages using pnpm.
 * @property {Object} yarn - Commands for yarn package manager.
 * @property {string} yarn.install - Command to install packages using yarn.
 * @property {string} yarn.run - Command to run scripts using yarn.
 * @property {string} yarn.build - Command to build project using yarn.
 * @property {string} yarn.dev - Command to run development server using yarn.
 * @property {string} yarn.list - Command to list installed packages using yarn.
 * @property {string} yarn.globalAdd - Command to install packages globally using yarn.
 * @property {string} yarn.globalList - Command to list globally installed packages using yarn.
 * @property {string} yarn.remove - Command to remove packages using yarn.
 */

/**
 * Object containing package manager commands for npm, pnpm, and yarn.
 * @type {PackageManagerCommands}
 */
const packageManagerCommands = {
	npm: {
		install: "npm install",
		run: "npm run",
		build: "npm run build",
		dev: "npm run dev",
		list: "npm list",
		add: "npm install",
		globalAdd: "npm install -g",
		globalList: "npm list -g",
		remove: "npm uninstall",
	},
	pnpm: {
		install: "pnpm install",
		run: "pnpm run",
		build: "pnpm run build",
		dev: "pnpm run dev",
		list: "pnpm list",
		add: "pnpm add",
		globalAdd: "pnpm add -g",
		globalList: "pnpm list -g",
		remove: "pnpm remove",
	},
	yarn: {
		install: "yarn",
		run: "yarn",
		build: "yarn build",
		dev: "yarn dev",
		list: "yarn list",
		add: "yarn add",
		globalAdd: "yarn global add",
		globalList: "yarn global list",
		remove: "yarn remove",
	},
	bun: {
		install: "bun install",
		run: "bun run",
		build: "bun build",
		dev: "bun run dev",
		list: "bun list",
		add: "bun add",
		globalAdd: "bun add --global",
		globalList: "bun list --global",
		remove: "bun remove",
	},
};

/**
 * Checks if a package is installed using pnpm.
 * @param {string} packageName - The name of the package to check.
 * @param {string} destination - The directory where the project is located.
 * @returns {boolean} - True if the package is installed, false otherwise.
 */
function isPackageInstalled(selectedPackageManager, packageName, destination) {
	try {
		const output = execSync(`${packageManagerCommands[selectedPackageManager].list}`, {
			stdio: "pipe",
			encoding: "utf-8",
			cwd: destination,
		});
		return output.includes(packageName);
	} catch (error) {
		log.error(`Failed to check if ${packageName} is installed:`, error.message);
		return false;
	}
}

/**
 * Checks if a command is available in the system.
 *
 * @param {string} command - The command to check.
 * @returns {boolean} - True if the command is available, false otherwise.
 */
function isCommandAvailable(command) {
	try {
		const output = execSync(command, { stdio: "pipe", encoding: "utf-8" });

		// Special handling for package checking commands
		if (command.includes("npm list -g") || command.includes("pnpm list -g") || command.includes("yarn global list")) {
			// Extract package name from command
			const packageName = command.split("-g")[1].trim();

			// If the output doesn't include the package name, it's not installed
			if (!output.includes(packageName)) {
				return false;
			}
		}

		return true;
	} catch (error) {
		return false;
	}
}

/**
 * Checks if the given package manager is installed.
 * @param {string} packageManager - The package manager to check for (e.g., "npm", "pnpm", "yarn").
 * @returns {boolean} - Returns true if the package manager is installed, otherwise false.
 */
function isPackageManagerInstalled(packageManager) {
	try {
		// The '--version' flag is common among the three package managers to get the installed version
		execSync(`${packageManager} --version`);
		return true;
	} catch (error) {
		return false;
	}
}

/**
 * Checks if the given package manager is installed.
 * If not, tries to install it.
 * @param {string} packageManager - The package manager to check for (e.g., "npm", "pnpm", "yarn").
 */
function ensurePackageManagerInstalled(packageManager) {
	const installers = {
		npm: "https://www.npmjs.com/get-npm",
		pnpm: "npm install -g pnpm",
		yarn: "npm install -g yarn",
		bun: "npm install -g bun",
	};

	if (!isPackageManagerInstalled(packageManager)) {
		log.info(`The selected package manager '${packageManager}' is not installed. Attempting to install...`);

		if (packageManager === "npm") {
			error(`Please install npm manually from ${installers.npm} and then rerun the script.`);
			return;
		}

		try {
			log.info(`${installers[packageManager]}`);
			execSync(installers[packageManager], { stdio: "inherit" });
			log.info(`${packageManager} has been installed successfully.`);
		} catch (error) {
			log.error(`Failed to install ${packageManager}. Please install it manually and rerun the script.`);
		}
	}
}

export { packageManagerCommands, isPackageInstalled, isCommandAvailable, isPackageManagerInstalled, ensurePackageManagerInstalled };
