import { execSync } from "child_process";
import { isCommandAvailable } from "../utils/pkg.js";
import { log } from "../utils/log.js";
import { isGitRepo } from "../vcs/git.js";
import inquirer from "inquirer";

/**
 * Ensures that the GitHub CLI (gh) is installed.
 */
function ensureGHCLI() {
	if (!isCommandAvailable("gh --version")) {
		console.warn("GitHub CLI (gh) is not installed but is required for certain operations.");
		console.warn("Please visit 'https://github.com/cli/cli#installation' to install the GitHub CLI.");
		process.exit(1); // Terminate the program.
	} else {
		log.info("GitHub CLI (gh) is already installed.");
	}
}

/**
 * Returns the GitHub username of the user who executed the command.
 * If the username cannot be retrieved, it returns a default value.
 *
 * @returns {string} The GitHub username or a default value.
 */
async function getGitHubUsername() {
	try {
		const output = execSync("gh api user", { encoding: "utf-8" });
		const data = JSON.parse(output);
		return data.login;
	} catch (error) {
		log.error("Failed to retrieve GitHub username. It's likely you're not authenticated with the GitHub CLI.");

		const { action } = await inquirer.prompt([
			{
				type: "list",
				name: "action",
				message: "You are not authenticated with the GitHub CLI. What would you like to do?",
				choices: [
					{ name: "Authenticate now", value: "authenticate" },
					{ name: "Continue without authenticating", value: "continue" },
				],
			},
		]);

		if (action === "authenticate") {
			try {
				execSync("gh auth login", { stdio: "inherit" }); // This will open the interactive gh login process
				const output = execSync("gh api user", { encoding: "utf-8" });
				const data = JSON.parse(output);
				return data.login;
			} catch (loginError) {
				log.error("Failed to authenticate with GitHub CLI:", loginError.message);
				return null;
			}
		} else {
			console.warn("Continuing without GitHub CLI authentication.");
			return null;
		}
	}
}

/**
 * Creates a new GitHub repository with the specified name.
 *
 * @param {string} repoName - The name of the new repository.
 */
async function createGitHubRepo(packageName) {
	let success = false;

	while (!success) {
		try {
			console.log(`Creating the public repo ${packageName} on GitHub...`);
			execSync(`gh repo create ${packageName} --public`, { stdio: "inherit" });
			success = true; // Exit the loop if successful
		} catch (error) {
			console.error("Failed to create the repo:", error.message);

			// Prompt for a new repo name
			const answers = await inquirer.prompt([
				{
					type: "input",
					name: "newRepoName",
					message: "Enter a new repository name:",
					default: `${packageName}-retry`,
				},
			]);
			packageName = answers.newRepoName;
		}
	}
}

/**
 * Checks if the current Git repository is connected to GitHub.
 *
 * @returns {boolean} - True if the current Git repository is connected to GitHub, false otherwise.
 */
function isRepoConnectedToGitHub(destination) {
	try {
		const remoteURL = execSync("git config --get remote.origin.url", { encoding: "utf8", cwd: destination }).trim();
		return remoteURL.includes("github.com");
	} catch (error) {
		return false;
	}
}

/**
 * Pushes changes to GitHub.
 * @async
 * @function pushToGitHub
 * @param {string} destination - The path to the directory where the changes are located.
 * @returns {Promise<boolean>} - A promise that resolves to true if the changes were pushed successfully, or false if the user chose to continue despite the push failure.
 */
async function pushToGitHub(packageName, destination) {
	try {
		execSync("git push -u origin main", { stdio: "inherit", cwd: destination });
	} catch (error) {
		log.error("Failed to push to GitHub:", error.message);

		try {
			// Create the GitHub repository
			createGitHubRepo(packageName);

			// Retry the push
			execSync("git push -u origin main", { stdio: "inherit", cwd: destination });
		} catch (repoError) {
			log.error("Failed to create repository and push:", repoError.message);

			const { confirmContinue } = await inquirer.prompt([
				{
					type: "confirm",
					name: "confirmContinue",
					message: `Failed to push changes to github, do you want to continue anyway?`,
					default: false,
				},
			]);

			if (!confirmContinue) {
				log.info("Aborted. Exiting...");
				process.exit(1);
			} else {
				return false;
			}
		}
	}

	return true;
}

/**
 * Ensures that the current Git repository is connected to GitHub. If not, it will create a new GitHub repository and push all local changes to it.
 * @async
 * @function ensureConnectedToGitHub
 * @param {string} destination - The destination directory.
 * @returns {boolean} - Returns true if the local changes were successfully pushed to the new GitHub repository, false otherwise.
 */
async function ensureConnectedToGitHub(packageName, destination) {
	// Check if the directory is a Git repo
	if (!isGitRepo()) {
		log.error("This directory is not a Git repository. Initializing it as one.");
		execSync("git init", { stdio: "inherit", cwd: destination });
	}

	// Check if the repo is connected to GitHub
	if (!isRepoConnectedToGitHub(destination)) {
		log.info("This repository is not connected to GitHub.");

		if (!isCommandAvailable("gh")) {
			const choices = await inquirer.prompt([
				{
					type: "list",
					name: "action",
					message: "GitHub CLI (gh) is not installed but is required for certain operations. What would you like to do?",
					choices: [
						{ name: "Exit the CLI", value: "exit" },
						{ name: "Continue without attaching the repo to GitHub", value: "continue" },
					],
				},
			]);

			if (choices.action === "exit") {
				log.info("Exiting CLI. Please install GitHub CLI and run again.");
				process.exit(0);
			}
			// If user chooses to continue, the function will just end and won't push changes to GitHub
			return false;
		}

		// If GitHub CLI is installed, then continue with the process
		createGitHubRepo(packageName); // Create a new GitHub repo with the name of the destination directory
	}

	log.info("Pushing all local changes to github.");
	execSync("git add .", { stdio: "inherit", cwd: destination }); // Stage all files
	execSync('git commit -m "Initial commit" --allow-empty', { stdio: "inherit", cwd: destination }); // Commit changes

	const username = await getGitHubUsername();

	try {
		log.info("Searching for the origin repo.");
		execSync("git remote get-url origin", { stdio: "inherit", cwd: destination });
	} catch (error) {
		// If getting the remote URL fails, it likely means the remote isn't set up.
		log.info(`Adding the origin repo. to https://github.com/${username}/${packageName}.git`);
		execSync(`git remote add origin https://github.com/${username}/${packageName}.git`, { stdio: "inherit", cwd: destination });
	}

	var success = await pushToGitHub(packageName, destination); // Push changes to the new GitHub repo

	return success; // This handles the case where the repo is already connected to GitHub
}

export { ensureGHCLI, getGitHubUsername, createGitHubRepo, isRepoConnectedToGitHub, pushToGitHub, ensureConnectedToGitHub };
