const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const env = require('./config/env');
const logger = require('./middlewares/logger');
const responseFormatter = require('./middlewares/responseFormatter');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

app.use(
  cors({
    origin: env.allowedOrigins.length > 0 ? env.allowedOrigins : true,
    credentials: true,
  }),
);
app.use(logger);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(responseFormatter);

app.use(routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
