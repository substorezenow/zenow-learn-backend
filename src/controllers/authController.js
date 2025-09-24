const authService = require("../services/authService");

const register = async (req, res) => {
  try {
    const user = await authService.register(req.body);
    res.status(201).json({ user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const login = async (req, res) => {
  try {
    console.log("request is comming for login. ");

    const token = await authService.login(req.body);
    res.status(200).json({ token });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
};

const tokenValidated = async (req, res) => {
  return res.status(200).json({ valid: true, user: req.user });
};

exports.authController = { register, login, tokenValidated };
