function responseFormatter(req, res, next) {
  res.success = (data, statusCode = 200) => {
    const payload = { success: true };

    if (typeof data !== 'undefined') {
      payload.data = data;
    }

    return res.status(statusCode).json(payload);
  };

  res.fail = (message, statusCode = 400, details = null) => {
    const payload = {
      success: false,
      error: {
        message,
      },
    };

    if (details) {
      payload.error.details = details;
    }

    return res.status(statusCode).json(payload);
  };

  next();
}

module.exports = responseFormatter;
