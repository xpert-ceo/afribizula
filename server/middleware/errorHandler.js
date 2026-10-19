import mongoose from "mongoose";
import ApiError from "../utils/ApiError.js";

export function notFound(req, _res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  let status = err.status || err.statusCode || 500;
  let message = err.message || "Unexpected error";
  let details = err.details;

  if (err instanceof mongoose.Error.ValidationError) {
    status = 400;
    message = "Validation failed";
    details = Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message]));
  } else if (err instanceof mongoose.Error.CastError) {
    status = 400;
    message = `Invalid value for ${err.path}`;
  } else if (err?.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyPattern || err.keyValue || {})[0] || "field";
    message = `A record with this ${field} already exists`;
  } else if (err?.type === "entity.parse.failed") {
    status = 400;
    message = "Malformed JSON body";
  } else if (err?.type === "entity.too.large") {
    status = 413;
    message = "Request body too large";
  } else if (
    err instanceof mongoose.Error.MongooseServerSelectionError ||
    /buffering timed out|before initial connection|Client must be connected|connection .* closed/i.test(message)
  ) {
    status = 503;
    message = "Database temporarily unavailable. Please try again shortly.";
  }

  if (status >= 500 && status !== 503) {
    console.error(`[error] ${req.method} ${req.originalUrl}:`, err);
    if (!(err instanceof ApiError)) message = "Something went wrong on our side. Please try again.";
  }

  const body = { message };
  if (details) body.details = details;
  res.status(status).json(body);
}
