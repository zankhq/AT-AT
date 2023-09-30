import { promises as fs } from "fs";
import path from "path";
import { log } from "../utils/log.js";

const dirExclusions = ["node_modules", "bin", ".git", ".astro"]; // Add any additional directories you want to exclude here
const fileExclusions = [".DS_Store", ".git"]; // Add any additional files you want to exclude here

/**
 * Checks if a file or directory exists at the given path.
 * @param {string} path - The path to check for existence.
 * @returns {Promise<boolean>} - A Promise that resolves to true if the file or directory exists, false otherwise.
 */
async function exists(path) {
	try {
		await fs.access(path);
		return true;
	} catch {
		return false;
	}
}

/**
 * Deletes a directory and all its contents recursively.
 *
 * @param {string} directoryPath - The path of the directory to delete.
 */
async function deleteDirectoryRecursive(directoryPath) {
	if (await exists(directoryPath)) {
		const files = await fs.readdir(directoryPath);
		for (const file of files) {
			const curPath = path.join(directoryPath, file);
			const stats = await fs.lstat(curPath);
			if (stats.isDirectory()) {
				// Recursive delete if it's a directory
				await deleteDirectoryRecursive(curPath);
			} else {
				// Delete the file
				await fs.unlink(curPath);
			}
		}
		await fs.rm(directoryPath, { recursive: true, force: true }); // Remove the directory itself
	}
}

/**
 * Copies a file or directory recursively from the source path to the destination path.
 *
 * @param {string} src - The source path.
 * @param {string} dest - The destination path.
 */
async function copyRecursive(src, dest) {
	try {
		const stats = await fs.stat(src);
		const isDirectory = stats.isDirectory();
		if (isDirectory) {
			const isExcluded = dirExclusions.includes(path.basename(src));
			if (isExcluded) return;
		} else {
			const isExcluded = fileExclusions.includes(path.basename(src));
			if (isExcluded) return;
		}

		if (isDirectory) {
			await fs.mkdir(dest, { recursive: true });

			const children = await fs.readdir(src, { withFileTypes: true });
			for (const child of children) {
				const name = child.name;
				await copyRecursive(path.join(src, name), path.join(dest, name));
			}
		} else {
			await fs.copyFile(src, dest);
		}
	} catch (err) {
		log.error(`Error copying from ${src} to ${dest}: ${err.message}`);
	}
}

export { exists, deleteDirectoryRecursive, copyRecursive };
