// Not Found
const notFound = (req, res, next) => {
  const error = new Error(`Not Found:${req.originalUrl}`);
  res.status(404).json({
    status: "failed",
    message: error.message,
  });
  next(error);
};

// error Handler

const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode == 200 ? 500 : res.statusCode;
  res.status(statusCode).send({
    status: "failed",
    message: err?.message,
    // stack: err.stack,
  });
};

module.exports = { errorHandler, notFound };
