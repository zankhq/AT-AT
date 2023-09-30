import { execSync } from "child_process";

/**
 * Checks if the current directory is a Git repository.
 *
 * @returns {boolean} - True if the current directory is a Git repository, false otherwise.
 */
function isGitRepo() {
	try {
		execSync("git status", { stdio: "ignore" });
		return true;
	} catch (error) {
		return false;
	}
}

/**
 * Gets the name of the current Git user.
 *
 * @returns {string} - The name of the current Git user.
 */
function getGitAuthorName() {
	try {
		const name = execSync("git config user.name", { encoding: "utf8" }).trim();
		return name;
	} catch (error) {
		console.warn("Failed to get git user name:", error.message);
		return "your name"; // or a default value
	}
}

export { isGitRepo, getGitAuthorName };
