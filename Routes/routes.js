const routes = require("express").Router();

routes.use("/", require("./users"));
routes.use("/", require("./posts"));
routes.use("/", require("./auth"));
routes.use("/", require("./searchQueries"));
routes.use("/", require("./messages"));
routes.use("/", require("./portifolio"));

module.exports = routes;
