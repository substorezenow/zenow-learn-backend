const bcrypt = require("bcryptjs");
const userDb = require("./userDb");

async function createSuperUser() {
  const username = process.env.SUPERUSER_NAME || "kanhekarbrijesh@gmail.com";
  const password = process.env.SUPERUSER_PASS || "pass@123";
  const hash = await bcrypt.hash(password, 10);
  const user = await userDb.createUser({
    username,
    password: hash,
    role: "superuser",
  });
  console.log("Superuser created:", user);
}

module.exports = { createSuperUser };
