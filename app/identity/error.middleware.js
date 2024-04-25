const logger=require('../logger');

const {
  InvalidTokenError,
  UnauthorizedError,
} = require("express-oauth2-jwt-bearer");

const errorHandler = (error, request, response, next) => {
  if (error instanceof InvalidTokenError) {
    logger.error(`Auth0 error: ${error.code}: ${error.message}`)
    const message = "Bad credentials";
    response.status(error.status).json({ message });

    return;
  }

  if (error instanceof UnauthorizedError) {
    const message = "Requires authentication";

    response.status(error.status).json({ message });

    return;
  }

  const status = 500;
  const message = "Internal Server Error";

  response.status(status).json({ message });
};

module.exports = {
  errorHandler,
};
