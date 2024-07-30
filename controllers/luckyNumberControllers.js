const expressAsyncHandler = require("express-async-handler");
const Lucky = require("../models/LuckyNumberModel");
const randomstring = require("randomstring");
const {
  randomDeleteLuckyWithStatus,
  getMethod,
  putMethod,
} = require("../services/query");
const User = require("../models/User");
const LimitModel = require("../models/LimitModel");
const { responseMethod } = require("../utils/response");
const RewardModel = require("../models/RewardModel");
const ReportModel = require("../models/ReportModel");
const WheelModel = require("../models/WheelModel");

// Generate Random String
async function generateRandomString() {
  const randomLetters = randomstring.generate({
    length: 2,
    charset: "alphabetic",
    capitalization: "uppercase",
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
// @private
// get all LuckyNumber
// @access Admin
const getAllLucky = expressAsyncHandler(async (req, res, next) => {
  try {
    const queryStr = { ...req.query };
    const luckies = await getMethod(Lucky, queryStr, req);
    const totalCount = await Lucky.countDocuments();
    responseMethod({ status: "succeed", data: { luckies, totalCount } }, res);
  } catch (error) {
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
        const allAvailableNumbers = await Lucky.find({
          status: { $in: ["available"] },
        });
        const randomIndex = Math.floor(
          Math.random() * allAvailableNumbers.length
        );
        const randomLucky = allAvailableNumbers[randomIndex];
        updatedLucky = await Lucky.findByIdAndUpdate(
          randomLucky._id,
          {
            user: req.user.id,
            status: "requested",
          },
          { new: true }
        );
      }
    } else {
      updatedLucky = givenLucky;
    }

    console.log(updatedLucky, "line 110");
    const index = allRewards.findIndex(
      (reward) => reward._id.toString() === updatedLucky.reward.toString()
    );
    console.log(Math.floor(18000 - ((index + 1) * 360) / wheel.slices), wheel);
    responseMethod(
      {
        status: "Succeed",
        updatedLucky,
        deg: Math.floor(18000 - ((index + 1) * 360) / wheel.slices),
      },
      res
    );
  } catch (e) {
    console.log(e);
    throw new Error(e);
  }
});

// generate luckyNumber depending on the quantity of Reward is created
const generateLucky = expressAsyncHandler(async (qty, id) => {
  //   console.log(qty, id);
  try {
    let randomString = "";
    let curQty = 0;
    const generatedStrings = [];

    while (curQty < qty) {
      randomString = await generateRandomString();
      // console.log(randomString);
      if (generatedStrings.includes(randomString)) {
        continue;
      }
      const codeAvailable = await checkCodeAvailability(randomString);

      if (codeAvailable) {
        // Add the random string to the database
        generatedStrings.push(randomString);
        curQty++;
      }
    }

    Promise.all(
      generatedStrings.map(async (string) => {
        const obj = {
          code: string,
          reward: id,
        };
        const newLucky = await Lucky.create({ ...obj });
      })
    );
    return "success";
  } catch (error) {
    throw new Error("An error occurred in generating lucky Number");
  }
});

const updateLucky = expressAsyncHandler(async (req, res, next) => {
  const exist = await Lucky.findById(req.params.id);
  if (exist && exist?.status !== "out") {
    let body = {};
    if (req.body?.status) {
      body = { ...req.body };
    } else {
      body.status = exist.status === "available" ? "preset" : "available";
    }
    try {
      const updatedLucky = await putMethod(req.params.id, body, Lucky);
      if (updatedLucky.status === "preset") {
        await RewardModel.findByIdAndUpdate(updatedLucky.reward, {
          $inc: { quantity: -1, presetQuantity: 1 },
        });
      } else if (updatedLucky.status === "out" && exist.status === "preset") {
        await RewardModel.findByIdAndUpdate(updatedLucky.reward, {
          $inc: { presetQuantity: -1 },
        });
      } else {
        await RewardModel.findByIdAndUpdate(updatedLucky.reward, {
          $inc: { quantity: -1 },
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
          lucky: updatedLucky._id,
          user: updatedLucky.user,
          agent: luckyUser.upLine,
        });
      }
      res.send(updatedLucky);
      res.status(204);
    } catch (error) {
      throw new Error(error);
    }
  }
  throw new Error("The Id you entered is invalid (or) already out.");
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
      generateLucky(newQuantity - availableCodes.length, reward);
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
module.exports = {
  generateLucky,
  modifyLuckyByRewardQuantity,
  deleteLucky,
  getRandomLuckyNumber,
  getAllLucky,
  updateLucky,
};
