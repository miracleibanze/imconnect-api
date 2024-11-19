const { logEvents } = require("./loggers");

const errorHandler = (err, req, res, next) => {
  logEvents(
    `${err.name}\t${err.message}\t${err.method}\t${err.path}\t${err.origin}`,
    "errLog.log"
  );
  const status = res.statusCode ? res.statusCode : 500;
  res.status(status);
  res.json({ message: err.message });
  next();
};

module.exports = errorHandler;
