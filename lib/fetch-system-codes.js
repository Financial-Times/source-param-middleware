'use strict';

const request = require('request');
const httpError = require('http-errors');
const pkg = require('../package.json');

module.exports = fetchSystemCodes;

// Fetch all system codes from the CMDB API
function fetchSystemCodes(apiKey, page = 1, systemCodes = []) {
	const url = buildApiUrl(page);
	let totalPages;

	// Get a page of system code JSON
	return getJson(url, apiKey)
		.then(response => {
			// Grab the total number of pages of system codes
			totalPages = getPagesFromCountHeader(response.headers.count);
			// We're only interested in system codes
			return response.body
				.filter(entry => entry.dataItemID)
				.map(entry => entry.dataItemID);
		})
		.then(newCodes => {
			// Add the new system codes to our in-progress full list
			systemCodes = systemCodes.concat(newCodes);
			// If we haven't iterated over all of the available pages
			// of system codes, we recurse with an incremented page
			if (page < totalPages) {
				return fetchSystemCodes(apiKey, page + 1, systemCodes);
			}
			// We've got all of the available system codes, we can
			// stop recursing and return them
			return systemCodes;
		});
}

// Build an API URL with a provided API key and page
function buildApiUrl(page) {
	// After some experimentation, this is the number of results
	// we can safely request per page with no risk of gateway
	// timeouts or other issues
	const perPageLimit = 250;
	return `https://cmdb.in.ft.com/v3/items/system?page=${page}&limit=${perPageLimit}`;
}

// Parse the Count header to get the total number of
// pages of system codes that there are
function getPagesFromCountHeader(countHeader) {
	if (typeof countHeader !== 'string') {
		return 1;
	}
	const match = countHeader.match(/^pages: (\d+),/i);
	return (match && match[1] ? match[1] : 1);
}

// Fetch JSON from an URL using a GET request
function getJson(url, apiKey) {
	return new Promise((resolve, reject) => {
		request({
			headers: {
				'User-Agent': `${pkg.name}@${pkg.version} (${pkg.homepage})`,
				'X-Api-Key': apiKey
			},
			json: true,
			url
		}, (error, response) => {
			if (error) {
				return reject(error);
			}
			if (response.statusCode >= 400) {
				return reject(httpError(response.statusCode));
			}
			resolve(response);
		});
	});
}
