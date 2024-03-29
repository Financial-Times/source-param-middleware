# Source Param Middleware [![NPM version](https://img.shields.io/npm/v/@financial-times/source-param-middleware.svg)](https://www.npmjs.com/package/@financial-times/source-param-middleware) [![Build status](https://img.shields.io/circleci/project/Financial-Times/source-param-middleware.svg)](https://circleci.com/gh/Financial-Times/source-param-middleware) [![MIT licensed](https://img.shields.io/badge/license-MIT-blue.svg)][license]

Middleware to require a valid source parameter in [Express] requests.

**Deprecated: The CMDB API used by this package no longer exists. There is no direct replacement at the time of writing but there is an example of [similar functionality implemented within the Origami Build Service](https://github.com/Financial-Times/origami-build-service/blob/a4a81e5fff26f41e95ddddba76cda5f8fefdb8b7/lib/middleware/v3/parseSystemCodeParameter.js#L49).**

## Table Of Contents

  - [Usage](#usage)
    - [Requirements](#requirements)
    - [API Documentation](#api-documentation)
    - [Options](#options)
  - [Contributing](#contributing)
  - [Publishing](#publishing)
  - [Migration guides](#migration-guides)
  - [Contact](#contact)
  - [Licence](#licence)


## Usage

### Requirements

Running the Source Param Middleware requires [Node.js] 10.x and [npm]. You can install with:

```sh
npm install @financial-times/source-param-middleware
```

### API Documentation

This library provides [Express] middleware, familiarity is assumed in the rest of the API documentation. In the examples, `app` is your Express application. You'll also need to require the module with:

```js
const sourceParam = require('@financial-times/source-param-middleware');
```

### `sourceParam( [options] )`

This function returns a new middleware function which can be used to validate a source parameter. You can configure the created middleware with [an options object](#options) if you need to override any defaults.

```js
const requireSourceParam = sourceParam({
    cmdbApiKey: 'xxxxxx'
});

app.get('/your-api-endpoint', requireSourceParam, (request, response) => {
    // route code goes here...
});
```

### Options

The Source Param Middleware can be configured with a variety of options, passed in as an object to the `sourceParam` function. The available options are as follows:

  - `cmdbApiKey`: The [CMDB] API key used to validate the source parameter.
  - `errorMessage`: The error message to output if the source parameter is not present and valid. Defaults to `"The source parameter is required and should be a valid system code"`
  - `pollInterval`: How often to check for new system codes on [CMDB] in milliseconds. Defaults to 60000 (1 minute)
  - `validationExceptions`: An array of source parameter values which should always pass validation, bypassing CMDB checks. These values are still required to be between 1 and 255 characters in length. Defaults to `["test"]`
  - `verifyUsingCmdb`: Whether to verify that the source parameter is a valid system code using [CMDB]. Defaults to `true`


## Contributing

This module has a full suite of unit tests, and is verified with ESLint. You can use the following commands to check your code before opening a pull request.

```sh
make verify  # verify JavaScript code with ESLint
make test    # run the unit tests and check coverage
```

## Publishing

New versions of the module are published automatically by CI when a new tag is created matching the pattern `/v.*/`.

## Migration Guides

State | Major Version | Last Minor Release | Migration guide |
:---: | :---: | :---: | :---:
✨ active | 2 | N/A | [migrate to v2](MIGRATION.md#migrating-from-v1-to-v2) |
⚠ maintained | 1 | 1.0 | N/A |

## Contact

If you have any questions or comments about this module, or need help using it, please either [raise an issue][issues], visit [#origami-support] or email [Origami Support].


## Licence

This software is published by the Financial Times under the [MIT licence][license].


[#origami-support]: https://financialtimes.slack.com/messages/origami-support/
[cmdb]: http://cmdb.ft.com/
[express]: http://expressjs.com/
[issues]: https://github.com/Financial-Times/source-param-middleware/issues
[license]: http://opensource.org/licenses/MIT
[node.js]: https://nodejs.org/
[npm]: https://www.npmjs.com/
[origami support]: mailto:origami-support@ft.com
