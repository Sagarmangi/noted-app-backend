require("dotenv").config();
const UserModel = require("../Models/UserModel");
const jwt = require("jsonwebtoken");
const maxAge = 3 * 24 * 60 * 60;

const createToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: maxAge,
  });
};

const handleErrors = (err) => {
  let errors = { email: "", password: "" };
  if (err.message === "incorrect email") {
    errors.email = "Email Address is not registered";
  }
  if (err.message === "incorrect Password") {
    errors.password = "Password is incorrect";
  }
  if (err.message === "incorrect password") {
    errors.password = "That password is incorrect";
  }
  if (err.code === 11000) {
    errors.email = "Email is already registered";
    return errors;
  }
  if (err.message.includes("Users validation failed")) {
    Object.values(err.errors).forEach(({ properties }) => {
      errors[properties.path] = properties.message;
    });
  }
  return errors;
};

module.exports.register = async (req, res, next) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    const user = await UserModel.create({
      firstName,
      lastName,
      email,
      password,
    });
    const token = createToken(user._id);

    res.cookie("jwt", token, {
      domain: "nbuco7.csb.app",
      withCredentials: true,
      httpOnly: false,
      maxAge: maxAge * 1000,
      sameSite: "none",
      secure: true,
    });
    res.status(201).json({
      user: user._id,
      firstName: user.firstName,
      created: true,
      jwt: token,
    });
  } catch (err) {
    console.log(err);
    const errors = handleErrors(err);
    res.json({ errors, created: false });
  }
};

module.exports.login = async (req, res, next) => {
  const { email, password } = req.body;
  try {
    const user = await UserModel.login(email, password);

    const token = createToken(user._id);

    res.cookie("jwt", token, {
      domain: "nbuco7.csb.app",
      httpOnly: false,
      maxAge: maxAge * 1000,
      sameSite: "none",
      secure: true,
    });
    res.status(200).json({
      user: user._id,
      firstName: user.firstName,
      status: true,
      jwt: token,
    });
  } catch (err) {
    console.log(err);
    const errors = handleErrors(err);
    res.json({ errors, status: false });
  }
};
