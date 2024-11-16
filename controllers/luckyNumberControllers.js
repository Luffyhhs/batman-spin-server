const expressAsyncHandler = require("express-async-handler");
const Lucky = require("../models/LuckyNumberModel");
const randomstring = require("randomstring");
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

// Generate Random String
async function generateRandomString() {
  const uppercaseAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const randomLetters = randomstring.generate({
    length: 2,
    charset: uppercaseAlphabet,
  });
  //   console.log(randomLetters);
  const randomNumbers = randomstring.generate({
    length: 8,
    charset: "numeric",
  });
  //   console.log(randomNumbers);
  const randomString = randomLetters + randomNumbers;
  //   console.log(randomString);
  return randomString;
}

// check code is available or existed
async function checkCodeAvailability(string) {
  try {
    const code = await Lucky.findOne({ code: string });
    return !code; // Return true if code is not found, false otherwise
  } catch (error) {
    // console.log(error);
    return false; // Return false in case of any error
  }
}
const generateLucky = async (qty, id) => {
  try {
    const generatedStrings = new Set();

    while (generatedStrings.size < qty) {
      const randomString = await generateRandomString();

      if (!generatedStrings.has(randomString)) {
        const codeAvailable = await checkCodeAvailability(randomString);

        if (codeAvailable) {
          generatedStrings.add(randomString);
        }
      }
    }
    const luckyObjects = Array.from(generatedStrings).map((string) => ({
      code: string,
      reward: id,
    }));
    const luckyArray = await Lucky.insertMany(luckyObjects);

    return luckyArray.length === qty ? luckyArray : "failed";
  } catch (error) {
    console.error("An error occurred in generating lucky Number:", error);
    throw new Error("An error occurred in generating lucky Number");
  }
};

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

// const getRandomLuckyNumber = expressAsyncHandler(async (req, res, next) => {
//   try {
//     // get currentUser from req.user
//     const currentUser = await User.findById(req.user.id);
//     //check total deposit
//     const totalDeposit = currentUser.deposits.reduce(
//       (prev, curr) => prev + curr,
//       0
//     );
//     // upLine User Limit from limit model
//     const upLineUserLimit = await LimitModel.findOne({
//       agent: currentUser.upLine,
//     });
//     // check if total deposit greater than equal to upLine user limit
//     if (upLineUserLimit.limit <= totalDeposit) {
//       // get all availableLucky
//       const allAvailableLucky = await Lucky.find({
//         status: "available",
//       }).select("code");

//       let numOfTickets = Math.floor(totalDeposit / upLineUserLimit.limit);
//       let leftAmount = totalDeposit % upLineUserLimit.limit;
//       let ticketsArray = [];
//       while (numOfTickets > ticketsArray.length) {
//         const randomIndex = Math.floor(
//           Math.random() * allAvailableLucky.length
//         );
//         let randomLucky = allAvailableLucky[randomIndex];
//         // add random to return array
//         ticketsArray.push(randomLucky);
//         // remove randomLucky from allAvailableLucky Array
//         allAvailableLucky.splice(randomIndex, 1);
//         await Lucky.findByIdAndUpdate(
//           randomLucky._id,
//           {
//             user: currentUser._id,
//             status: "requested",
//           },
//           { new: true }
//         );
//       }
//       await User.findByIdAndUpdate(currentUser._id, { $set: { deposits: [] } });
//       const updatedUser = await User.findByIdAndUpdate(
//         currentUser._id,
//         { $push: { deposits: leftAmount } },
//         { new: true }
//       );
//       console.log(ticketsArray.length);
//       res.json({ data: ticketsArray });
//     } else {
//       throw new Error("You do not have sufficient deposit amount to get code.");
//     }
//   } catch (e) {
//     throw new Error(e);
//   }
// });
// const generateLucky = async (qty, id) => {
//   //   console.log(qty, id);
//   try {
//     let randomString = "";
//     let curQty = 0;
//     const generatedStrings = [];

//     while (curQty < qty) {
//       randomString = await generateRandomString();
//       // console.log(randomString);
//       if (generatedStrings.includes(randomString)) {
//         continue;
//       }
//       const codeAvailable = await checkCodeAvailability(randomString);

//       if (codeAvailable) {
//         // Add the random string to the database
//         generatedStrings.push(randomString);
//         curQty++;
//       }
//     }

//     const luckyArray = Promise.all(
//       generatedStrings.map(async (string) => {
//         const obj = {
//           code: string,
//           reward: id,
//         };
//         const newLucky = await postCreateMethod(Lucky, obj);
//       })
//     );
//     if ((await luckyArray).length == qty) return await luckyArray;
//     else return "failed";
//   } catch (error) {
//     console.log(error);
//     throw new Error("An error occurred in generating lucky Number");
//   }
// };
// const generateLucky = async (qty, id) => {
//   try {
//     const worker = new Worker("./worker_threads/worker.js"); // Adjust the path to your worker script

//     const generatedStrings = new Set();

//     worker.postMessage({ qty });

//     const workerPromise = new Promise((resolve, reject) => {
//       worker.on("message", (message) => {
//         message.forEach((string) => generatedStrings.add(string));
//         resolve();
//       });

//       worker.on("error", reject);
//       worker.on("exit", (code) => {
//         if (code !== 0) {
//           reject(new Error(`Worker stopped with exit code ${code}`));
//         }
//       });
//     });

//     await workerPromise;

//     const luckyArray = [];
//     for (const string of generatedStrings) {
//       const obj = {
//         code: string,
//         reward: id,
//       };
//       const result = await postCreateMethod(Lucky, obj);
//       luckyArray.push(result);
//     }

//     if (luckyArray.length === qty) return luckyArray;
//     else return "failed";
//   } catch (error) {
//     console.log(error);
//     throw new Error("An error occurred in generating lucky Number");
//   }
// };
module.exports = {
  generateLucky,
  modifyLuckyByRewardQuantity,
  deleteLucky,
  getRandomLuckyNumber,
  getAllLucky,
  updateLucky,
  checkCodeAvailability,
  generateRandomString,
  getLuckyById,
};
