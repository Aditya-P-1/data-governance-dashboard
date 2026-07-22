function errorHandler(err, req, res) {
  const statusCode = err.statusCode || 500;
  const message =
    statusCode === 500 && !err.isOperational ? 'Internal server error' : err.message || 'Error';

  if (statusCode >= 500) {
    console.error(err);
  }

  const payload = {
    success: false,
    error: {
      message,
    },
  };

  if (err.details) {
    payload.error.details = err.details;
  }

  return res.status(statusCode).json(payload);
}

module.exports = errorHandler;
