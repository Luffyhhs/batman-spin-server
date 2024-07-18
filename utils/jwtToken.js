const jwt = require("jsonwebtoken");

exports.generateToken = (obj) => {
  let data = {
    id: obj._id,
  };
  return jwt.sign(data, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_TOKEN_EXPIRE,
  });
};
