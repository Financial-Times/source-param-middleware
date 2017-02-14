'use strict';

const request = require('request');
const httpError = require('http-errors');
const pkg = require('../package.json');

module.exports = fetchSystemCodes;

// Fetch all system codes from the CMDB API
function fetchSystemCodes(apiKey, page = 1, systemCodes = []) {
	const url = buildApiUrl(apiKey, page);
	let totalPages;

	// Get a page of system code JSON
	return getJson(url)
		.then(response => {
			// Grab the total number of pages of system codes
			totalPages = getPagesFromCountHeader(response.headers.count);
			// We're only interested in system code values
			return response.body.map(entry => entry.value);
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
function buildApiUrl(apiKey, page) {
	return `https://cmdb.ft.com/v2/itemattributes/?attributeType=systemCode&apikey=${apiKey}&page=${page}`;
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
function getJson(url) {
	return new Promise((resolve, reject) => {
		request({
			headers: {
				'User-Agent': `${pkg.name}@${pkg.version} (${pkg.homepage})`
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
