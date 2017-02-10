'use strict';

const assert = require('proclaim');
const mockery = require('mockery');
const sinon = require('sinon');

describe('lib/middleware/require-source-param', () => {
	let defaults;
	let express;
	let httpError;
	let sourceParam;

	beforeEach(() => {
		defaults = sinon.spy(require('lodash/defaults'));
		mockery.registerMock('lodash/defaults', defaults);

		express = require('../mock/express.mock');

		httpError = require('../mock/http-errors.mock');
		mockery.registerMock('http-errors', httpError);

		sourceParam = require('../../../lib/source-param-middleware');
	});

	it('exports a function', () => {
		assert.isFunction(sourceParam);
	});

	it('has a `defaults` property', () => {
		assert.isObject(sourceParam.defaults);
	});

	describe('.defaults', () => {

		it('has an `errorMessage` property', () => {
			assert.deepEqual(sourceParam.defaults.errorMessage, 'The source parameter is required and should be a valid system code');
		});

	});

	describe('sourceParam()', () => {
		let middleware;
		let options;

		beforeEach(() => {
			options = {
				errorMessage: 'mock-error-message'
			};
			middleware = sourceParam(options);
		});

		it('defaults the passed in options', () => {
			assert.calledOnce(defaults);
			assert.isObject(defaults.firstCall.args[0]);
			assert.strictEqual(defaults.firstCall.args[1], options);
			assert.strictEqual(defaults.firstCall.args[2], sourceParam.defaults);
		});

		it('returns a middleware function', () => {
			assert.isFunction(middleware);
		});

		describe('middleware(request, response, next)', () => {
			let next;

			beforeEach(() => {
				next = sinon.spy();
				express.mockRequest.query.source = 'test';
				middleware(express.mockRequest, express.mockResponse, next);
			});

			it('calls `next` with no error', () => {
				assert.calledOnce(next);
				assert.calledWithExactly(next);
			});

			describe('when the `source` query parameter is missing', () => {

				beforeEach(() => {
					next.reset();
					httpError.reset();
					delete express.mockRequest.query.source;
					middleware(express.mockRequest, express.mockResponse, next);
				});

				it('creates a 400 HTTP error with `options.errorMessage`', () => {
					assert.calledOnce(httpError);
					assert.calledWithExactly(httpError, 400, options.errorMessage);
				});

				it('calls `next` with the created error', () => {
					assert.calledOnce(next);
					assert.calledWithExactly(next, httpError.mockError);
				});

			});

			describe('when the `source` query parameter is an empty string', () => {

				beforeEach(() => {
					next.reset();
					httpError.reset();
					express.mockRequest.query.source = '';
					middleware(express.mockRequest, express.mockResponse, next);
				});

				it('creates a 400 HTTP error with `options.errorMessage`', () => {
					assert.calledOnce(httpError);
					assert.calledWithExactly(httpError, 400, options.errorMessage);
				});

				it('calls `next` with the created error', () => {
					assert.calledOnce(next);
					assert.calledWithExactly(next, httpError.mockError);
				});

			});

			describe('when the `source` query parameter is longer than 255 characters', () => {

				beforeEach(() => {
					next.reset();
					httpError.reset();
					express.mockRequest.query.source = Array(256).fill('x').join('');
					middleware(express.mockRequest, express.mockResponse, next);
				});

				it('creates a 400 HTTP error with `options.errorMessage`', () => {
					assert.calledOnce(httpError);
					assert.calledWithExactly(httpError, 400, options.errorMessage);
				});

				it('calls `next` with the created error', () => {
					assert.calledOnce(next);
					assert.calledWithExactly(next, httpError.mockError);
				});

			});

		});

	});

});
