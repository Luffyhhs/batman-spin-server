const expressAsyncHandler = require("express-async-handler");
const { postCreateMethod, getMethod, putMethod } = require("../services/query");
const User = require("../models/User");
const { responseMethod } = require("../utils/response");
const { checkExist, validateMongodbId } = require("../utils/utilsFunctions");
const { generateToken } = require("../utils/jwtToken");
const jwt = require("jsonwebtoken");
const LimitModel = require("../models/LimitModel");
const { createTransaction } = require("./transactionControllers");
const { status } = require("express/lib/response");

// signUp or create a user
exports.signUp = expressAsyncHandler(async (req, res, next) => {
  try {
    const body = { ...req.body };
    console.log(body);

    const exist = await checkExist(User, { name: body.name }, res);
    console.log(exist);

    if (exist !== null) {
      Object.keys(exist).length > 0 &&
        responseMethod(
          {
            status: "failed",
            message: "User already Exist.",
          },
          res
        );
    } else {
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
    }
  } catch (error) {
    throw new Error(error);
  }
});

exports.getUsers = expressAsyncHandler(async (req, res, next) => {
  try {
    const queryStr = { ...req.query };
    if (req.user.role === "Agent") {
      queryStr.upLine = req.user.id;
    }
    console.log(queryStr);
    let query = getMethod(User, queryStr, req);
    // if (req.query.id) {
    //   query = User.find({ id: req.query.id });
    // }
    // const
    let users = [];
    let totalCount = 0;
    // console.log(req.user);
    if (req.user.role === "Admin") {
      totalCount = await User.countDocuments(query);
      // console.log(totalCount);
      users = await query;
    } else {
      if (queryStr?.upLine && queryStr.id) {
        users = await User.find({ upLine: queryStr.upLine, _id: queryStr.id });
      } else {
        users = await query;
      }
      totalCount = users.length;
    }
    console.log(users);
    responseMethod(
      {
        status: "succeed",
        data: users,
        totalCount,
      },
      res
    );
  } catch (error) {
    console.log(error.stack);
    throw new Error(error);
  }
});

exports.getOwnInfo = expressAsyncHandler(async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("-password -__v");
    responseMethod({ status: "succeed", data: user }, res);
  } catch (error) {
    throw new Error(error);
  }
});

exports.logInDashboard = expressAsyncHandler(async (req, res, next) => {
  try {
    const { name, password } = req.body;
    const exist = await checkExist(User, { name }, res);
    if (exist !== null && exist.status) {
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
    } else {
      res.statusCode = 403;
      throw new Error("You Have Been Banned.");
    }
  } catch (error) {
    console.log(error.stack, "line 135");
    throw new Error(error);
  }
});

exports.logInUser = expressAsyncHandler(async (req, res, next) => {
  try {
    const { name, password } = req.body;
    // console.log(req.body, "login user 96");
    const exist = await checkExist(User, { name }, res);
    if (exist !== null && exist.status) {
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
    } else {
      res.statusCode = 403;
      throw new Error("You have been banned.");
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
  const { id } = req.params;

  validateMongodbId(id);
  const existUser = await checkExist(User, { _id: id }, res);
  let upLineUser = {};
  if (existUser) {
    upLineUser = await User.findById(existUser.upLine);
    let body = {};
    if (req.body?.name) {
      body.name = req.body.name;
    }
    if (req.body?.status !== undefined) {
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
    if (req.body?.deposits) {
      if (upLineUser.unit < req.body.deposits) {
        res.statusCode = 403;
        throw new Error("Your don't have enough unit to add deposit to user.");
      } else {
        try {
          const updatedUser = await User.findByIdAndUpdate(
            id,
            { $inc: { deposits: req.body.deposits } },
            { new: true }
          );
          const updatedUpLine = await User.findByIdAndUpdate(
            updatedUser.upLine,
            {
              $inc: { unit: -req.body.deposits },
            },
            { new: true }
          );
          const transactionObj = {
            fromId: req.user.id,
            toId: updatedUser._id,
            actionAmount: req.body.deposits,
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

    responseMethod(
      {
        status: "succeed",
        message: "User updated successfully.",
      },
      res
    );
  }

  // res.sendStatus(204);
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
