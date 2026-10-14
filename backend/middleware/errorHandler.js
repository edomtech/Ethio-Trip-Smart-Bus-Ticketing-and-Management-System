
const SAFE_ERROR_NAMES = new Set([
  'ValidationError',
  'CastError',
  'NotFoundError',
]);


const statusForError = (err) => {
  if (err.statusCode || err.status) return err.statusCode || err.status;

  if (err.name === 'ValidationError' || err.name === 'ValidatorError') return 400;
  if (err.name === 'CastError') return 400;

  if (err.code === 11000 || err.code === 11001) return 409;

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') return 401;

  if (err.type === 'entity.parse.failed') return 400;
  if (err.type === 'entity.too.large') return 413;

  return 500;
};


const clientMessage = (err, statusCode) => {
  if (err.name === 'ValidationError' && err.errors) {
    const messages = Object.values(err.errors)
      .map((e) => e.message)
      .filter(Boolean);
    if (messages.length) return messages.join(', ');
  }

  if (err.code === 11000 || err.code === 11001) {
    return 'A record with these details already exists.';
  }

  if (err.name === 'CastError') {
    return `Invalid value for "${err.path}".`;
  }

  if (SAFE_ERROR_NAMES.has(err.name) || statusCode < 500) {
    return err.message || 'Request failed';
  }

  return 'Internal Server Error';
};

const errorHandler = (err, req, res, next) => {
  console.error(`[Error] ${err.name || 'Error'}: ${err.message}`);
  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }

  if (res.headersSent) return next(err);

  const statusCode = statusForError(err);

  res.status(statusCode).json({
    success: false,
    message: clientMessage(err, statusCode),
    ...(process.env.NODE_ENV === 'development' && process.env.EXPOSE_STACK_TRACES === 'true'
      ? { stack: err.stack }
      : {}),
  });
};

module.exports = errorHandler;