const expressAsyncHandler = require("express-async-handler");
const { postCreateMethod, getMethod, putMethod } = require("../services/query");
const User = require("../models/User");
const { responseMethod } = require("../utils/response");
const { checkExist, validateMongodbId } = require("../utils/utilsFunctions");
const { generateToken } = require("../utils/jwtToken");
const jwt = require("jsonwebtoken");
const LimitModel = require("../models/LimitModel");
const { createTransaction } = require("./transactionControllers");

// signUp or create a user
exports.signUp = expressAsyncHandler(async (req, res, next) => {
  try {
    const body = { ...req.body };

    const newUser = await postCreateMethod(User, body);
    if (newUser.role === "Agent") {
      await LimitModel.create({
        agent: newUser._id,
      });
    }
    responseMethod(
      {
        status: "succeed",
        data: newUser,
      },
      res
    );
  } catch (error) {
    throw new Error(error);
  }
});

exports.getUsers = expressAsyncHandler(async (req, res, next) => {
  try {
    const queryStr = req.query;
    const users = await getMethod(User, queryStr, req);
    responseMethod(
      {
        status: "succeed",
        data: users,
      },
      res
    );
  } catch (error) {
    throw new Error(error);
  }
});

exports.logInDashboard = expressAsyncHandler(async (req, res, next) => {
  try {
    const { name, password } = req.body;
    const exist = await checkExist(User, { name }, res);
    if (exist !== null) {
      if (exist?.role === "User") {
        responseMethod(
          {
            status: "failed",
            massage: "You don't have permission to do this action.",
          },
          res
        );
      } else {
        if (await exist.isPasswordMatched(password)) {
          const refreshToken = generateToken(exist);
          const updateUser = await User.findByIdAndUpdate(
            exist?._id,
            {
              refreshToken: refreshToken,
            },
            { new: true }
          ).select("-password -__v");

          res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            maxAge: 24 * process.env.COOKIE_EXPIRE * 60 * 60 * 1000,
          });
          responseMethod({ status: "succeed", data: updateUser }, res);
        } else {
          responseMethod(
            { status: "failed", message: "Incorrect Password!" },
            res
          );
        }
      }
    }
  } catch (error) {
    // console.log(error, "line 74");
    throw new Error(error);
  }
});

exports.logInUser = expressAsyncHandler(async (req, res, next) => {
  try {
    const { name, password } = req.body;
    // console.log(req.body, "login user 96");
    const exist = await checkExist(User, { name }, res);
    if (exist !== null) {
      if (exist?.status !== false) {
        if (await exist.isPasswordMatched(password)) {
          const refreshToken = generateToken(exist);
          const updateUser = await User.findByIdAndUpdate(
            exist?._id,
            {
              refreshToken: refreshToken,
            },
            { new: true }
          ).select("-password -__v");

          res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            maxAge: 24 * process.env.COOKIE_EXPIRE * 60 * 60 * 1000,
          });
          responseMethod(updateUser, res);
        } else {
          responseMethod(
            { status: "failed", message: "Incorrect Password!" },
            res
          );
        }
      } else {
        throw new Error("You have been banned.");
      }
    }
  } catch (error) {
    // console.log(error, "line 111");
    throw new Error(error);
  }
});

//handle refresh token
exports.handleRefreshToken = expressAsyncHandler(async (req, res) => {
  const cookie = req.cookies;
  // console.log(cookie);
  if (!cookie?.refreshToken) {
    throw new Error("No refresh Token in cookies");
  }
  const refreshToken = cookie.refreshToken;
  const user = await User.findOne({ refreshToken });
  if (!user) {
    throw new Error("No refresh token present in db or not matched");
  }
  jwt.verify(refreshToken, process.env.JWT_SECRET, (err, decoded) => {
    if (err || user.id !== decoded.id) {
      throw new Error("There is something wrong with refresh token");
    }
    const accessToken = generateToken(user);
    res.json({ accessToken });
  });
});

// Logout functionality
exports.logout = expressAsyncHandler(async (req, res) => {
  const cookie = req.cookies;
  if (!cookie?.refreshToken) {
    throw new Error("No refresh token present in db or not matched");
  }
  const refreshToken = cookie.refreshToken;
  const exist = await checkExist(User, { refreshToken }, res);
  if (!exist) {
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: true,
    });
    return res.sendStatus(204); // forbidden
  }
  await User.findOneAndUpdate(
    { refreshToken },
    {
      refreshToken: "",
    },
    { new: true }
  );
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: true,
  });
  res.sendStatus(204); // forbidden
});

exports.updateUser = expressAsyncHandler(async (req, res, next) => {
  const { id } = req.body;
  // console.log("update user ", req);
  // console.log(req.body);
  validateMongodbId(id);
  const existUser = await checkExist(User, { _id: id }, res);
  let upLineUser = {};
  if (existUser) {
    upLineUser = await User.findById(existUser.upLine);
  }
  let body = {};
  if (req.body?.name) {
    body.name = req.body.name;
  }
  if (req.body?.status) {
    body.status = req.body.status;
  }
  if (req.body?.unit) {
    try {
      const updatedUser = await User.findByIdAndUpdate(
        id,
        { $inc: { unit: req.body.unit } },
        { new: true }
      );
      const transactionObj = {
        fromId: req.user.id,
        toId: updatedUser._id,
        actionAmount: req.body.unit,
        beforeAmount: existUser.unit,
        afterAmount: updatedUser.unit,
        type: "admin-unit",
        status: req.body.unit > 0 ? "in" : "out",
      };
      createTransaction(transactionObj);
    } catch (error) {
      throw new Error(error);
    }
  }
  if (req.body?.deposit) {
    if (upLineUser.unit < req.body.deposit) {
      throw new Error("Your don't have enough unit to add deposit to user.");
    } else {
      try {
        const updatedUser = await User.findByIdAndUpdate(
          id,
          { $inc: { deposits: req.body.deposit } },
          { new: true }
        );
        const updatedUpLine = await User.findByIdAndUpdate(
          updatedUser.upLine,
          {
            $inc: { unit: -req.body.deposit },
          },
          { new: true }
        );
        const transactionObj = {
          fromId: req.user.id,
          toId: updatedUser._id,
          actionAmount: req.body.deposit,
          beforeAmount: existUser.deposits,
          afterAmount: updatedUser.deposits,
          type: "agent-unit",
          status: req.body.unit > 0 ? "out" : "in",
        };
        createTransaction(transactionObj);
      } catch (error) {
        throw new Error(error);
      }
    }
  }

  if (Object.entries(body).length !== 0) {
    try {
      const updatedUser = await putMethod(id, body, User);
    } catch (error) {
      throw new Error(error);
    }
  }

  res.sendStatus(204);
});

exports.updateUnitsFromAdmin = expressAsyncHandler(async (req, res, next) => {
  const { id } = req.body;
  validateMongodbId(id);
  const existUser = await checkExist(User, { _id: id }, res);
  try {
    if (existUser) {
      const updatedUser = await User.findByIdAndUpdate(
        id,
        { $inc: { unit: req.body.unit } },
        { new: true }
      );
      const transactionObj = {
        fromId: req.user.id,
        toId: updatedUser._id,
        actionAmount: req.body.unit,
        beforeAmount: existUser.unit,
        afterAmount: updatedUser.unit,
        type: "admin-unit",
        status: req.body.unit > 0 ? "in" : "out",
      };
      createTransaction(transactionObj);
      responseMethod(
        {
          status: "success",
          message: `You Update ${existUser.name} Unit successfully.`,
        },
        res
      );
    }
  } catch (error) {
    throw new Error(error);
  }
});

exports.getDownLineUser = expressAsyncHandler(async (req, res, next) => {
  try {
    const downLineUsers = await User.find({ upLine: req.user.id });
    responseMethod(
      {
        status: "succeed",
        data: downLineUsers,
      },
      res
    );
  } catch (error) {
    throw new Error(error);
  }
});

exports.getSpinTime = expressAsyncHandler(async (req, res, next) => {
  try {
    // console.log(req.user);
    // console.log(req);
    const agentLimit = await LimitModel.findOne({ agent: req.user.upLine });

    let spinTime = Math.floor(req.user.deposits / agentLimit.limit);
    responseMethod({ spinTime }, res);
  } catch (error) {
    console.log(error);
    throw new Error(error);
  }
});
