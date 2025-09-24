const { Client } = require("pg");

let cockroachClient;

function connectCockroach() {
  if (process.env.COCKROACH_URL) {
    cockroachClient = new Client({
      connectionString: process.env.COCKROACH_URL,
      ssl: { rejectUnauthorized: false },
    });
  } else {
    cockroachClient = new Client({
      host: process.env.COCKROACH_HOST || "localhost",
      port: process.env.COCKROACH_PORT || 26257,
      user: process.env.COCKROACH_USER || "root",
      password: process.env.COCKROACH_PASS || "",
      database: process.env.COCKROACH_DB || "defaultdb",
      ssl:
        process.env.COCKROACH_SSL === "true"
          ? { rejectUnauthorized: false }
          : false,
    });
  }
  cockroachClient
    .connect()
    .then(() => {
      console.log("Connected to CockroachDB");
    })
    .catch((err) => console.error("CockroachDB connection error:", err));
}

module.exports = { connectCockroach, cockroachClient };
