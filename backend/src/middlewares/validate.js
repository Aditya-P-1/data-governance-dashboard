const AppError = require('../utils/AppError');

function normalizeValidationError(source, message) {
  return {
    source,
    message,
  };
}

function runValidator(validator, value, source) {
  if (!validator) {
    return { value, error: null };
  }

  try {
    if (typeof validator === 'function') {
      return { value: validator(value), error: null };
    }

    if (typeof validator.safeParse === 'function') {
      const result = validator.safeParse(value);

      if (result.success) {
        return { value: result.data, error: null };
      }

      return {
        value,
        error: normalizeValidationError(source, result.error.message),
      };
    }

    if (typeof validator.parse === 'function') {
      return { value: validator.parse(value), error: null };
    }

    return { value, error: null };
  } catch (error) {
    return {
      value,
      error: normalizeValidationError(source, error.message),
    };
  }
}

function validate({ body, query, params } = {}) {
  return (req, res, next) => {
    const errors = [];

    const bodyResult = runValidator(body, req.body, 'body');
    req.body = bodyResult.value;
    if (bodyResult.error) {
      errors.push(bodyResult.error);
    }

    const queryResult = runValidator(query, req.query, 'query');
    req.query = queryResult.value;
    if (queryResult.error) {
      errors.push(queryResult.error);
    }

    const paramsResult = runValidator(params, req.params, 'params');
    req.params = paramsResult.value;
    if (paramsResult.error) {
      errors.push(paramsResult.error);
    }

    if (errors.length > 0) {
      return next(new AppError('Validation failed', 400, errors));
    }

    return next();
  };
}

module.exports = validate;
