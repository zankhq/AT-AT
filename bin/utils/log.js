var log = {
	/**
	 * Logs a message to the console.
	 *
	 * @param {string} message - The message to log.
	 */
	info: function (message) {
		console.log(message);
	},
	/**
	 * Logs an error message to the console.
	 *
	 * @param {string} message - The error message to log.
	 */
	error: function (message) {
		console.error(message);
	},
};

export { log };

export default log;
