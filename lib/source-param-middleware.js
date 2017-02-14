'use strict';

const defaults = require('lodash/defaults');
const fetchSystemCodes = require('./fetch-system-codes');
const httpError = require('http-errors');

module.exports = sourceParam;

module.exports.defaults = {
	cmdbApiKey: null,
	errorMessage: 'The source parameter is required and must be a valid system code',
	log: console,
	pollInterval: 300000, // 5 minutes
	validationExceptions: [
		'test'
	],
	verifyUsingCmdb: true
};

// Create a middleware function which requires the
// request to contain a valid source parameter
function sourceParam(options) {
	options = defaults({}, options, module.exports.defaults);
	let validSystemCodes;

	// If we're verifying with CMDB then start
	// polling for a list of valid system codes
	if (options.verifyUsingCmdb) {
		pollSystemCodes();
		setInterval(pollSystemCodes, options.pollInterval);
	}

	// Function used to poll for system codes
	function pollSystemCodes() {
		// Note we need to return here to allow tests
		// to hook into the promise
		return fetchSystemCodes(options.cmdbApiKey)
			.then(codes => {
				validSystemCodes = codes.concat(options.validationExceptions);
			})
			.catch(error => {
				// If the poll errors then we don't throw,
				// we just start letting any valid source
				// parameter through
				validSystemCodes = undefined;
				options.log.error(`CMDB error: ${error.message}`);
			});
	}

	// The generated middleware function
	function middleware(request, response, next) {
		const source = request.query.source;

		// Check for a valid system code format
		if (!isValidSystemCodeFormat(source)) {
			return next(httpError(400, options.errorMessage));
		}

		// If we have a copy of the system codes array,
		// check the source parameter against it
		if (validSystemCodes && !validSystemCodes.includes(source)) {
			return next(httpError(400, options.errorMessage));
		}

		// If we don't have system codes from CMDB, but
		// are supposed to validate against them...
		if (options.verifyUsingCmdb && !validSystemCodes) {
			options.log.warn(`CMDB warning: The system code "${source}" cannot be verified due to a CMDB failure`);
		}

		return next();
	}

	// Return the middleware
	return middleware;
}

// Check for a valid system code format
function isValidSystemCodeFormat(source) {
	return (typeof source === 'string' && source.length >= 1 && source.length <= 255);
}
