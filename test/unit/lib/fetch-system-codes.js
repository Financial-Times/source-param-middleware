'use strict';

const assert = require('proclaim');
const mockery = require('mockery');
const pkg = require('../../../package.json');

describe('lib/middleware/fetch-system-codes', () => {
	let expectedHeaders;
	let fetchSystemCodes;
	let httpError;
	let request;
	let userAgent;

	beforeEach(() => {
		httpError = require('../mock/http-errors.mock');
		mockery.registerMock('http-errors', httpError);

		request = require('../mock/request.mock');
		mockery.registerMock('request', request);

		userAgent = `${pkg.name}@${pkg.version} (${pkg.homepage})`;
		expectedHeaders = {
			'User-Agent': userAgent,
			'X-Api-Key': 'mock-api-key'
		};

		fetchSystemCodes = require('../../../lib/fetch-system-codes');
	});

	it('exports a function', () => {
		assert.isFunction(fetchSystemCodes);
	});

	describe('fetchSystemCodes(apiKey)', () => {
		let mockResponse1;
		let mockResponse2;
		let mockResponse3;
		let resolvedValue;
		let returnedPromise;

		beforeEach(() => {

			mockResponse1 = {
				statusCode: 200,
				headers: {
					count: 'Pages: 3, Items: 4'
				},
				body: [
					{dataItemID: 'foo'},
					{noDataItemID: 'this should not appear'},
					{dataItemID: 'bar'}
				]
			};
			mockResponse2 = {
				statusCode: 200,
				headers: {
					count: 'Pages: 3, Items: 4'
				},
				body: [
					{noDataItemID: 'this should not appear'},
					{dataItemID: 'baz'}
				]
			};
			mockResponse3 = {
				statusCode: 200,
				headers: {
					count: 'Pages: 3, Items: 4'
				},
				body: [
					{dataItemID: 'qux'}
				]
			};
			request.onCall(0).yields(null, mockResponse1);
			request.onCall(1).yields(null, mockResponse2);
			request.onCall(2).yields(null, mockResponse3);

			return returnedPromise = fetchSystemCodes('mock-api-key').then(value => {
				resolvedValue = value;
			});
		});

		it('returns a Promise', () => {
			assert.instanceOf(returnedPromise, Promise);
		});

		it('calls `request` for each page of system codes', () => {
			assert.calledThrice(request);
			assert.calledWith(request.getCall(0), {
				headers: expectedHeaders,
				json: true,
				url: 'https://cmdb.in.ft.com/v3/items/system?page=1&limit=250'
			});
			assert.calledWith(request.getCall(1), {
				headers: expectedHeaders,
				json: true,
				url: 'https://cmdb.in.ft.com/v3/items/system?page=2&limit=250'
			});
			assert.calledWith(request.getCall(2), {
				headers: expectedHeaders,
				json: true,
				url: 'https://cmdb.in.ft.com/v3/items/system?page=3&limit=250'
			});
		});

		it('resolves with an array of system codes', () => {
			assert.isArray(resolvedValue);
			assert.deepEqual(resolvedValue, [
				'foo',
				'bar',
				'baz',
				'qux'
			]);
		});

		describe('when a `Count` header is not present in the response', () => {

			beforeEach(() => {
				request.reset();
				delete mockResponse1.headers.count;
				return returnedPromise = fetchSystemCodes('mock-api-key').then(value => {
					resolvedValue = value;
				});
			});

			it('calls `request` once', () => {
				assert.calledOnce(request);
				assert.calledWith(request.getCall(0), {
					headers: expectedHeaders,
					json: true,
					url: 'https://cmdb.in.ft.com/v3/items/system?page=1&limit=250'
				});
			});

			it('resolves with an array of system codes', () => {
				assert.isArray(resolvedValue);
				assert.deepEqual(resolvedValue, [
					'foo',
					'bar'
				]);
			});

		});

		describe('when the `Count` header in the response is malformed', () => {

			beforeEach(() => {
				request.reset();
				mockResponse1.headers.count = 'Pages: one, Items: 2';
				return returnedPromise = fetchSystemCodes('mock-api-key').then(value => {
					resolvedValue = value;
				});
			});

			it('calls `request` once', () => {
				assert.calledOnce(request);
				assert.calledWith(request.getCall(0), {
					headers: expectedHeaders,
					json: true,
					url: 'https://cmdb.in.ft.com/v3/items/system?page=1&limit=250'
				});
			});

			it('resolves with an array of system codes', () => {
				assert.isArray(resolvedValue);
				assert.deepEqual(resolvedValue, [
					'foo',
					'bar'
				]);
			});

		});

		describe('when `request` errors', () => {
			let requestError;
			let caughtError;

			beforeEach(() => {
				request.reset();
				requestError = new Error('request error');
				request.onCall(0).yields(requestError);
				return returnedPromise = fetchSystemCodes('mock-api-key').catch(error => {
					caughtError = error;
				});
			});

			it('rejects with the request error', () => {
				assert.strictEqual(caughtError, requestError);
			});

		});

		describe('when the CMDB responds with a non-200 code', () => {
			let caughtError;

			beforeEach(() => {
				request.reset();
				mockResponse1.statusCode = 400;
				return returnedPromise = fetchSystemCodes('mock-api-key').catch(error => {
					caughtError = error;
				});
			});

			it('creates an HTTP error', () => {
				assert.calledOnce(httpError);
				assert.calledWithExactly(httpError, mockResponse1.statusCode);
			});

			it('rejects with the HTTP error', () => {
				assert.strictEqual(caughtError, httpError.mockError);
			});

		});

	});

});
