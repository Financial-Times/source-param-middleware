'use strict';

const defaults = require('lodash/defaults');
const httpError = require('http-errors');

module.exports = sourceParam;

module.exports.defaults = {
	errorMessage: 'The source parameter is required and should be a valid system code'
};

function sourceParam(options) {
	options = defaults({}, options, module.exports.defaults);

	return (request, response, next) => {
		if (!isValidSourceParam(request.query.source)) {
			return next(httpError(400, options.errorMessage));
		}
		next();
	};
}

function isValidSourceParam(source) {
	return (typeof source === 'string' && source.length >= 1 && source.length <= 255);
}
