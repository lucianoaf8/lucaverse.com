/**
 * Runs in Jest's `setupFiles` phase — BEFORE setupFilesAfterEnv (jest.setup.js).
 *
 * In the `node` test environment the native Web API globals (Request, Response,
 * FormData, Headers) exist on globalThis before setupFilesAfterEnv overwrites
 * them.  We save them here so integration tests can restore them after jest.setup.js
 * replaces global.Request / global.Response with toy jsdom-compatible mocks.
 *
 * In the `jsdom` environment these globals are undefined (jsdom does not expose
 * them), so this module simply exports undefined values for those entries —
 * jsdom tests must not rely on this module.
 *
 * Usage in node-environment integration tests:
 *   const { nativeRequest, nativeResponse, nativeFormData, nativeHeaders } =
 *     require('./setup/save-web-apis');
 *   // Restore before each test or at module scope:
 *   global.Request  = nativeRequest;
 *   global.Response = nativeResponse;
 */
module.exports = {
  nativeRequest:  global.Request,
  nativeResponse: global.Response,
  nativeFormData: global.FormData,
  nativeHeaders:  global.Headers,
  nativeFetch:    global.fetch,
};
