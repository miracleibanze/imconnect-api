const routes = require("express").Router();

routes.use("/api", require("./users"));
routes.use("/api", require("./posts"));
routes.use("/api", require("./auth"));
routes.use("/api", require("./searchQueries"));
routes.use("/api", require("./messages"));

module.exports = routes;
