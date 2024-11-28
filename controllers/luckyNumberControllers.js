const expressAsyncHandler = require("express-async-handler");
const Lucky = require("../models/LuckyNumberModel");
const { Worker } = require("node:worker_threads");

const {
  randomDeleteLuckyWithStatus,
  getMethod,
  putMethod,
  postCreateMethod,
} = require("../services/query");
const User = require("../models/User");
const LimitModel = require("../models/LimitModel");
const { responseMethod } = require("../utils/response");
const RewardModel = require("../models/RewardModel");
const ReportModel = require("../models/ReportModel");
const WheelModel = require("../models/WheelModel");
const { queryModification } = require("../utils/queryModification");
const { promisify } = require("util");
const crypto = require("crypto");

// Promisify the randomBytes function
const randomBytesAsync = promisify(crypto.randomBytes);

// Generate a random string
async function generateRandomString() {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const buffer = await randomBytesAsync(5);
  // Generate two random alphabetic characters
  const randomLetters = Array.from(
    { length: 2 },
    () => alphabet[Math.floor(Math.random() * alphabet.length)]
  ).join("");

  const randomNumbers = buffer.readUIntBE(2, 3) % 100000000;
  return `${randomLetters}${randomNumbers.toString().padStart(8, "0")}`;
}

// Check code availability in batch
async function checkCodeAvailabilityBatch(codes) {
  const existingCodes = await Lucky.find({ code: { $in: codes } })
    .lean()
    .select("code");
  const existingCodeSet = new Set(existingCodes.map((doc) => doc.code));
  return codes.filter((code) => !existingCodeSet.has(code));
}

// Generate and save lucky codes
async function generateAndSaveLuckyCodes(qty, id, batchSize = 1000) {
  let generatedCount = 0;
  const allGeneratedCodes = [];

  while (generatedCount < qty) {
    const batchQty = Math.min(batchSize, qty - generatedCount);
    const batchCodes = await generateBatch(batchQty);
    const availableCodes = await checkCodeAvailabilityBatch(batchCodes);

    if (availableCodes.length > 0) {
      const luckyObjects = availableCodes.map((code) => ({ code, reward: id }));
      await Lucky.insertMany(luckyObjects);
      allGeneratedCodes.push(...luckyObjects);
      generatedCount += availableCodes.length;
    }

    console.log(`Generated ${generatedCount} out of ${qty} codes`);
  }

  return allGeneratedCodes;
}

// Generate a batch of random strings
async function generateBatch(size) {
  const batch = [];
  for (let i = 0; i < size; i++) {
    batch.push(await generateRandomString());
  }
  return batch;
}

// Main function to generate lucky codes
async function generateLucky(qty, id) {
  try {
    const result = await generateAndSaveLuckyCodes(qty, id);
    return result.length === qty ? result : "failed";
  } catch (error) {
    console.error("An error occurred in generating lucky Number:", error);
    throw new Error("An error occurred in generating lucky Number");
  }
}

// @private
// get all LuckyNumber
// @access Admin
const getAllLucky = expressAsyncHandler(async (req, res, next) => {
  try {
    const queryStr = { ...req.query };
    // console.log(req.query?.reward);
    // console.log(queryStr);
    const query = queryModification(Lucky, queryStr, req, ["code"]);
    // Check if the query object has the populate method
    if (typeof query.populate !== "function") {
      throw new Error("Returned query object does not have a populate method");
    }
    const rewardPopulateOptions = { path: "reward", model: "Reward" };
    // const userPopulateOptions = { path: "user", model: "User" };
    let totalCount = await Lucky.countDocuments();
    // console.log(totalCount);
    if (req.query?.keyword || req.query?.status || req.query?.reward) {
      const { page, limit, ...rest } = req.query;
      totalCount = await Lucky.countDocuments(rest);
      if (req.query?.reward) {
        rewardPopulateOptions.match = { _id: req.query.reward };
      }
    }
    // Use populate with explicit path and model options
    const luckies = await query
      .populate(rewardPopulateOptions)
      .populate({ path: "user", model: "User" })
      .populate({ path: "presetAgent", model: "User" })
      .lean(); // Convert to plain JavaScript objects
    // console.log()
    // const filteredLuckies = req.query?.reward
    //   ? luckies.filter((lucky) => {
    //       console.log(lucky);
    //       return lucky.reward !== null;
    //     })
    //   : luckies;
    responseMethod(
      { status: "succeed", data: { data: luckies, totalCount } },
      res
    );
  } catch (error) {
    console.log("getError", error.stack);
    throw new Error(error);
  }
});

// @private
// get a random LuckyNumber from agent
// @access User
// GET /lucky/getRandom
const getRandomLuckyNumber = expressAsyncHandler(async (req, res, next) => {
  try {
    const currentTime = new Date();
    const checkIfUserIsPreset = await Lucky.findOne({
      presetAgent: req.user.upLine,
    });
    // console.log(checkIfUserIsPreset);
    let presetUpdatedTime;
    if (checkIfUserIsPreset) {
      presetUpdatedTime = new Date(checkIfUserIsPreset.outTime);
    }
    const allRewards = await RewardModel.find({});
    const wheel = await WheelModel.findOne({ name: "Wheel" });
    const givenLucky = await Lucky.findOne({
      user: req.user.id,
      status: "requested",
    });
    let updatedLucky = {};
    if (givenLucky === null) {
      if (
        checkIfUserIsPreset &&
        currentTime.getTime() >=
          presetUpdatedTime.getTime() + 2 * 60 * 60 * 1000
      ) {
        updatedLucky = await Lucky.findByIdAndUpdate(
          checkIfUserIsPreset._id,
          { user: req.user.id, status: "requested" },
          { new: true }
        );
      } else {
        const allAvailableNumbers = await Lucky.aggregate([
          { $match: { status: "available" } },
          { $sample: { size: 1 } },
        ]);
        if (allAvailableNumbers.length === 0) {
          updatedLucky === null;
        } else {
          const randomLucky = allAvailableNumbers[0];
          updatedLucky = await Lucky.findByIdAndUpdate(
            randomLucky._id,
            {
              user: req.user.id,
              status: "requested",
            },
            { new: true }
          );
        }
      }
    } else {
      updatedLucky = givenLucky;
    }

    if (updatedLucky) {
      const index = allRewards.findIndex(
        (reward) => reward._id.toString() === updatedLucky.reward.toString()
      );
      if (updatedLucky?.status === "out") {
        updatedLucky = updatedLucky.populate({
          path: "reward",
          model: "Reward",
        });
      }
      // console.log(updatedLucky, "random");
      responseMethod(
        {
          status: "Succeed",
          updatedLucky,
          deg: Math.floor(18000 - ((index + 1) * 360) / wheel.slices),
        },
        res
      );
    } else {
      responseMethod(
        {
          status: "failed",
          updatedLucky: null,
          message: "There is no luckyNumber available.",
        },
        res
      );
    }
  } catch (e) {
    console.log(e.stack);
    throw new Error(e);
  }
});

// generate luckyNumber depending on the quantity of Reward is created

const updateLucky = expressAsyncHandler(async (req, res, next) => {
  // console.log(req.body);
  const exist = await Lucky.findById(req.params.id);
  if (exist && exist?.status !== "out") {
    let body = {};
    if (req.body?.status) {
      body = { ...req.body };
    } else {
      body.status = exist.status === "available" ? "preset" : "available";
    }
    console.log(body);
    try {
      const updatedLucky = await putMethod(req.params.id, body, Lucky);
      console.log(updatedLucky);
      // logic for updating quantity of reward
      if (updatedLucky.status === "preset") {
        await RewardModel.findByIdAndUpdate(updatedLucky.reward, {
          $inc: { quantity: -1, presetQuantity: 1 },
        });
      } else if (updatedLucky.status === "out" && exist.status === "preset") {
        await RewardModel.findByIdAndUpdate(updatedLucky.reward, {
          $inc: { presetQuantity: -1 },
        });
      } else if (updatedLucky.status === "out") {
        await RewardModel.findByIdAndUpdate(updatedLucky.reward, {
          $inc: { quantity: -1 },
        });
      } else if (
        updatedLucky.status === "available" &&
        exist.status === "preset"
      ) {
        await RewardModel.findByIdAndUpdate(updatedLucky.reward, {
          $inc: { quantity: 1, presetQuantity: -1 },
        });
      }
      if (updatedLucky?.user !== undefined && updatedLucky.status === "out") {
        if (await ReportModel.findOne({ lucky: updatedLucky._id })) return;
        const luckyUser = await User.findById(updatedLucky.user);
        const upLineLimit = await LimitModel.findOne({
          agent: luckyUser.upLine,
        });
        await User.findByIdAndUpdate(luckyUser._id, {
          $inc: { deposits: -upLineLimit.limit },
        });
        await ReportModel.create({
          reward: updatedLucky.reward,
          lucky: updatedLucky._id,
          user: updatedLucky.user,
          agent: luckyUser.upLine,
        });
      }
      responseMethod(
        {
          status: "succeed",
          message: "Lucky updated successfully.",
          updatedLucky,
        },
        res
      );
      // res.send(updatedLucky);
      // res.status(204);
    } catch (error) {
      throw new Error(error);
    }
  } else {
    throw new Error("The Id you entered is invalid (or) already out.");
  }
});

const deleteLucky = async (reward) => {
  try {
    const deletedLuckies = await Lucky.deleteMany({
      reward: reward,
    });
    if (deletedLuckies.deletedCount > 0) {
      return "success";
    } else {
      return `No lucky with this rewardId:${reward}`;
    }
  } catch (error) {
    throw new Error(error);
  }
};

const modifyLuckyByRewardQuantity = async (reward, newQuantity) => {
  try {
    const availableCodes = await Lucky.find({
      reward: reward,
      status: { $in: ["available", "requested"] },
    });

    if (availableCodes.length < newQuantity) {
      await generateLucky(newQuantity - availableCodes.length, reward);
    } else {
      randomDeleteLuckyWithStatus(
        Lucky,
        availableCodes.length - newQuantity,
        reward
      );
    }
  } catch (error) {
    throw new Error(error);
  }
};

const getLuckyById = expressAsyncHandler(async (req, res, next) => {
  try {
    let lucky = Lucky.findById(req.params.id);
    console.log(lucky);
    lucky = await lucky.populate({
      path: "reward",
      model: "Reward",
    });
    responseMethod(
      {
        status: "succeed",
        data: lucky,
      },
      res
    );
  } catch (error) {
    throw new Error(error);
  }
});

module.exports = {
  generateLucky,
  modifyLuckyByRewardQuantity,
  deleteLucky,
  getRandomLuckyNumber,
  getAllLucky,
  updateLucky,
  generateRandomString,
  getLuckyById,
};
