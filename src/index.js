const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const routes = require("./routes");
const { errorHandler } = require("./middleware/errorHandler");
const config = require("./config");
const { connectCockroach } = require("./cockroach");
const bodyParser = require("body-parser");
const fileupload = require("express-fileupload");

const app = express();

// Security and logging middleware
app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(fileupload()); 

// Connect to CockroachDB
connectCockroach();

// API routes
app.use("/api", routes);

// Error handler
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});
