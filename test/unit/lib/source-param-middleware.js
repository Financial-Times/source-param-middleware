'use strict';

const assert = require('proclaim');
const mockery = require('mockery');
const sinon = require('sinon');

describe('lib/middleware/require-source-param', () => {
	let defaults;
	let express;
	let fetchSystemCodes;
	let httpError;
	let log;
	let sourceParam;

	beforeEach(() => {
		sinon.stub(global, 'setInterval');

		defaults = sinon.spy(require('lodash/defaults'));
		mockery.registerMock('lodash/defaults', defaults);

		express = require('../mock/express.mock');

		fetchSystemCodes = require('../mock/fetch-system-codes.mock');
		mockery.registerMock('./fetch-system-codes', fetchSystemCodes);

		httpError = require('../mock/http-errors.mock');
		mockery.registerMock('http-errors', httpError);

		log = require('../mock/log.mock');

		sourceParam = require('../../../lib/source-param-middleware');
	});

	afterEach(() => {
		global.setInterval.restore();
	});

	it('exports a function', () => {
		assert.isFunction(sourceParam);
	});

	it('has a `defaults` property', () => {
		assert.isObject(sourceParam.defaults);
	});

	describe('.defaults', () => {

		it('has a `cmdbApiKey` property', () => {
			assert.isNull(sourceParam.defaults.cmdbApiKey);
		});

		it('has an `errorMessage` property', () => {
			assert.deepEqual(sourceParam.defaults.errorMessage, 'The source parameter is required and must be a valid system code');
		});

		it('has a `log` property', () => {
			assert.strictEqual(sourceParam.defaults.log, console);
		});

		it('has a `pollInterval` property', () => {
			assert.strictEqual(sourceParam.defaults.pollInterval, 300000);
		});

		it('has a `verifyUsingCmdb` property', () => {
			assert.isTrue(sourceParam.defaults.verifyUsingCmdb);
		});

	});

	describe('sourceParam()', () => {
		let middleware;
		let options;

		beforeEach(() => {
			fetchSystemCodes.resolves([
				'test',
				'valid'
			]);
			options = {
				cmdbApiKey: 'mock-api-key',
				errorMessage: 'mock-error-message',
				log: log,
				pollInterval: 123
			};
			middleware = sourceParam(options);
		});

		it('defaults the passed in options', () => {
			assert.calledOnce(defaults);
			assert.isObject(defaults.firstCall.args[0]);
			assert.strictEqual(defaults.firstCall.args[1], options);
			assert.strictEqual(defaults.firstCall.args[2], sourceParam.defaults);
		});

		it('sets an interval', () => {
			assert.calledOnce(setInterval);
			assert.isFunction(setInterval.firstCall.args[0]);
			assert.strictEqual(setInterval.firstCall.args[1], options.pollInterval);
		});

		describe('interval()', () => {
			let interval;

			beforeEach(() => {
				fetchSystemCodes.reset();
				interval = setInterval.firstCall.args[0];
				interval();
			});

			it('calls `fetchSystemCodes` with the API key', () => {
				assert.calledOnce(fetchSystemCodes);
				assert.calledWithExactly(fetchSystemCodes, options.cmdbApiKey);
			});

			describe('when `fetchSystemCodes` errors', () => {
				let fetchError;

				beforeEach(() => {
					fetchError = new Error('fetch error');
					fetchSystemCodes.rejects(fetchError);
					return interval();
				});

				it('logs the error', () => {
					assert.called(options.log.error);
					assert.calledWithExactly(options.log.error, 'CMDB error: fetch error');
				});

			});

		});

		it('returns a middleware function', () => {
			assert.isFunction(middleware);
		});

		describe('middleware(request, response, next)', () => {
			let middlewareError;

			beforeEach(done => {
				express.mockRequest.query.source = 'test';
				middleware(express.mockRequest, express.mockResponse, error => {
					middlewareError = error;
					done();
				});
			});

			it('calls back with no error', () => {
				assert.isUndefined(middlewareError);
			});

			describe('when the `source` query parameter is missing', () => {

				beforeEach(done => {
					httpError.reset();
					delete express.mockRequest.query.source;
					middleware(express.mockRequest, express.mockResponse, error => {
						middlewareError = error;
						done();
					});
				});

				it('creates a 400 HTTP error with `options.errorMessage`', () => {
					assert.calledOnce(httpError);
					assert.calledWithExactly(httpError, 400, options.errorMessage);
				});

				it('calls back with the created error', () => {
					assert.strictEqual(middlewareError, httpError.mockError);
				});

			});

			describe('when the `source` query parameter is an empty string', () => {

				beforeEach(done => {
					httpError.reset();
					express.mockRequest.query.source = '';
					middleware(express.mockRequest, express.mockResponse, error => {
						middlewareError = error;
						done();
					});
				});

				it('creates a 400 HTTP error with `options.errorMessage`', () => {
					assert.calledOnce(httpError);
					assert.calledWithExactly(httpError, 400, options.errorMessage);
				});

				it('calls back with the created error', () => {
					assert.strictEqual(middlewareError, httpError.mockError);
				});

			});

			describe('when the `source` query parameter is longer than 255 characters', () => {

				beforeEach(done => {
					httpError.reset();
					express.mockRequest.query.source = Array(256).fill('x').join('');
					middleware(express.mockRequest, express.mockResponse, error => {
						middlewareError = error;
						done();
					});
				});

				it('creates a 400 HTTP error with `options.errorMessage`', () => {
					assert.calledOnce(httpError);
					assert.calledWithExactly(httpError, 400, options.errorMessage);
				});

				it('calls back with the created error', () => {
					assert.strictEqual(middlewareError, httpError.mockError);
				});

			});

			describe('when the `source` query parameter is not found in CMDB', () => {

				beforeEach(done => {
					httpError.reset();
					express.mockRequest.query.source = 'invalid';
					middleware(express.mockRequest, express.mockResponse, error => {
						middlewareError = error;
						done();
					});
				});

				it('creates a 400 HTTP error with `options.errorMessage`', () => {
					assert.calledOnce(httpError);
					assert.calledWithExactly(httpError, 400, options.errorMessage);
				});

				it('calls back with the created error', () => {
					assert.strictEqual(middlewareError, httpError.mockError);
				});

			});

		});

		describe('when `options.verifyUsingCmdb` is `false`', () => {

			beforeEach(() => {
				setInterval.reset();
				options.verifyUsingCmdb = false;
				middleware = sourceParam(options);
			});

			it('does not set an interval', () => {
				assert.notCalled(setInterval);
			});

			describe('middleware(request, response, next)', () => {
				let middlewareError;

				describe('when the `source` query parameter is not found in CMDB', () => {

					beforeEach(done => {
						express.mockRequest.query.source = 'invalid';
						middleware(express.mockRequest, express.mockResponse, error => {
							middlewareError = error;
							done();
						});
					});

					it('calls back with no error', () => {
						assert.isUndefined(middlewareError);
					});

				});

			});

		});

		describe('when fetching system codes has no response yet', () => {

			beforeEach(() => {
				fetchSystemCodes.resolves();
				middleware = sourceParam(options);
			});

			describe('middleware(request, response, next)', () => {
				let middlewareError;

				describe('when the `source` query parameter is not found in CMDB', () => {

					beforeEach(done => {
						express.mockRequest.query.source = 'invalid';
						middleware(express.mockRequest, express.mockResponse, error => {
							middlewareError = error;
							done();
						});
					});

					it('calls back with no error', () => {
						assert.isUndefined(middlewareError);
					});

				});

			});

		});

	});

});
