/**
 * asyncHandler - wraps an async Express handler and forwards errors to next()
 * Prevents unhandled promise rejections crashing the process.
 */
module.exports = function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
