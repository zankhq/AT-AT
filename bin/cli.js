#!/usr/bin/env node

/**
 * This script is the entry point for the CLI tool of the Astro Starter project.
 * It imports necessary modules, defines some constants, and provides utility functions
 * for copying files, checking if a command is available, and interacting with the user.
 * It also includes functions for ensuring that required tools like netlify-cli and gh are installed,
 * generating a netlify.toml file, creating a GitHub repository, and pushing changes to GitHub.
 *
 * @requires fs
 * @requires path
 * @requires child_process.execSync
 * @requires url.fileURLToPath
 * @requires path.dirname
 * @requires inquirer
 * @exports None
 */

import { promises as fs } from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname } from "path";
import inquirer from "inquirer";
import { ensurePackageManagerInstalled } from "./utils/pkg.js";
import { exists } from "./utils/fileUtils.js";
import { copyRecursive } from "./utils/fileUtils.js";
import { getGitAuthorName } from "./vcs/git.js";
import { displayWelcomeMessage } from "./utils/messages.js";
import { deployToNetlify } from "./deployment/netlify.js";
import { deployToCloudflare } from "./deployment/cloudflare.js";
import { packageManagerCommands } from "./utils/pkg.js";
import { log } from "./utils/log.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = path.join(__dirname, "..");

/**
 * The selected package manager for the project.
 * @type {"pnpm" | "npm" | "yarn" | "bun"}
 */
let selectedPackageManager = "pnpm";

/**
 * Initializes a new project by prompting the user for project details, copying files from the root directory to the destination,
 * updating package.json with the new name and author, installing packages, and optionally deploying the project to Netlify or Cloudflare Pages.
 * @async
 * @function main
 * @returns {Promise<void>} A Promise that resolves when the project initialization is complete.
 * @throws {Error} If there is an error creating the project.
 */
async function main() {
	try {
		const currentDirName = path.basename(process.cwd());

		const { packageName, destination, packageManager, publishProject } = await inquirer.prompt([
			{
				type: "input",
				name: "packageName",
				message: "How would you like to name your package?",
				default: currentDirName,
			},
			{
				type: "input",
				name: "destination",
				message: 'Where would you like to create the new project? (Provide a directory path, use "." for current directory)',
				default: ".",
			},
			{
				type: "list",
				name: "packageManager",
				message: "Which package manager would you like to use?",
				choices: ["npm", "pnpm", "yarn", "bun"],
				default: "pnpm",
			},
			{
				type: "list",
				name: "publishProject",
				message: "Where do you want to deploy your project?",
				choices: ["Netlify", "Cloudflare Pages", "Deploy manually"],
				default: "Netlify",
			},
		]);

		selectedPackageManager = packageManager;

		ensurePackageManagerInstalled(selectedPackageManager);

		if (!(await exists(destination))) {
			await fs.mkdir(destination, { recursive: true });
		} else if ((await fs.readdir(destination)).filter((file) => file !== ".git").length > 0) {
			const { confirm } = await inquirer.prompt([
				{
					type: "confirm",
					name: "confirm",
					message: `The directory ${destination} is not empty. Are you sure you want to proceed and overwrite its contents?`,
					default: false,
				},
			]);

			if (!confirm) {
				log.info("Aborted. Exiting...");
				return;
			}

			// If user confirms, proceed to remove any lock file and node_modules folder
			const lockFiles = ["package-lock.json", "yarn.lock", "pnpm-lock.yaml"];
			for (const lockFile of lockFiles) {
				const lockFilePath = path.join(destination, lockFile);
				if (await exists(lockFilePath)) {
					await fs.unlink(lockFilePath);
					log.info(`Removed ${lockFile}`);
				}
			}

			const nodeModulesPath = path.join(destination, "node_modules");
			if (await exists(nodeModulesPath)) {
				await fs.rm(nodeModulesPath, { recursive: true });
				log.info(`Removed node_modules`);
			}
		}

		// When more templates will be added add choice to pick which one to use
		// Define the path to the templates/starter folder
		const templateStarterDir = path.join(rootDir, "templates", "starter");

		// Copy all files and subdirectories from the root directory to the destination
		await copyRecursive(templateStarterDir, destination);

		// Rename .gitignore_include back to .gitignore
		const gitignoreIncludePath = path.join(destination, ".gitignore_include");
		const gitignorePath = path.join(destination, ".gitignore");
		if (await exists(gitignoreIncludePath)) {
			await fs.rename(gitignoreIncludePath, gitignorePath);
		}

		// Update package.json with the new name and author
		const packageJsonPath = path.join(destination, "package.json");
		const packageData = JSON.parse(await fs.readFile(packageJsonPath, "utf-8"));
		if (packageName) {
			packageData.name = packageName;
		}
		packageData.version = "0.0.1";
		packageData.author = getGitAuthorName();
		delete packageData.bin;
		delete packageData.files;
		delete packageData.main;
		delete packageData.repository;
		delete packageData.homepage;
		delete packageData.bugs;
		await fs.writeFile(packageJsonPath, JSON.stringify(packageData, null, 2));

		log.info(`Project initialized in ${destination}`);

		if (publishProject) {
			switch (publishProject) {
				case "Netlify":
					await deployToNetlify(selectedPackageManager, packageName, destination);
					break;
				case "Cloudflare Pages":
					await deployToCloudflare(selectedPackageManager, packageName, destination);
					break;
				default:
					break;
			}
		}

		log.info(`Starting packages installation ${destination}`);
		execSync(`${packageManagerCommands[selectedPackageManager].install}`, { stdio: "inherit", cwd: destination });
		log.info(`Packages installed successfully in ${destination}`);

		const { additionalPackages } = await inquirer.prompt([
			{
				type: "checkbox",
				name: "additionalPackages",
				message: "Which additional packages would you like to install?",
				choices: ["gsap", "three", "three-stdlib", "@vite-pwa/astro"], // Replace these with the packages you want to offer
			},
		]);

		if (additionalPackages.length > 0) {
			const packagesToInstall = additionalPackages.join(" ");
			log.info(`Installing additional packages: ${packagesToInstall} in ${destination}`);
			execSync(`${packageManagerCommands[selectedPackageManager].add} ${packagesToInstall}`, { stdio: "inherit", cwd: destination });
			log.info(`Additional packages installed successfully in ${destination}`);
		}

		try {
			displayWelcomeMessage(selectedPackageManager, publishProject);
		} catch (error) {
			console.error("An error occurred in displayWelcomeMessage:", error);
		}

		// Ask the user if they want to run the project, but only after the publishing step.
		const { runProject: shouldRunProject } = await inquirer.prompt([
			{
				type: "confirm",
				name: "runProject",
				message: `Do you want to run the project locally? (${packageManagerCommands[selectedPackageManager].dev})`,
				default: true,
			},
		]);

		// Ask user ro run the project or not
		if (shouldRunProject) {
			execSync(`${packageManagerCommands[selectedPackageManager].dev}`, { stdio: "inherit", cwd: destination });
		} else if (publishProject) {
			log.info(`You can run '${packageManagerCommands[selectedPackageManager].dev}' in ${destination} whenever you're ready.`);
			log.info(`🎉 Congratulations! Your project is set up and ready to go! 🎉`);
			log.info(`Next steps:`);
			log.info(`1. Dive into the code in ${destination} to start building.`);
			log.info(`2. Check the documentation or README for more detailed instructions.`);
			log.info(`3. If you have any issues or questions, don't hesitate to consult the community forums or support.`);
			log.info(`Happy coding! 💻`);
		}
	} catch (error) {
		log.error("Failed to create the project:", error.message);
	}
}

main();
