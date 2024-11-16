// const expressAsyncHandler = require("express-async-handler");
const Lucky = require("../models/LuckyNumberModel");
// const { Worker } = require("node:worker_threads");

// const {
//   randomDeleteLuckyWithStatus,
//   getMethod,
//   putMethod,
//   postCreateMethod,
// } = require("../services/query");
// const User = require("../models/User");
// const LimitModel = require("../models/LimitModel");
// const { responseMethod } = require("../utils/response");
// const RewardModel = require("../models/RewardModel");
// const ReportModel = require("../models/ReportModel");
// const WheelModel = require("../models/WheelModel");
// // const { queryModification } = require("../utils/queryModification");

// const generateLucky = async (qty, id) => {
//   console.log("working in worker");
//   try {
//     const worker = new Worker("./worker_threads/worker.js"); // Adjust the path to your worker script

//     worker.postMessage({ qty, id });

//     const workerPromise = new Promise((resolve, reject) => {
//       worker.on("generateStrings", resolve);
//       worker.on("error", reject);
//       worker.on("exit", (code) => {
//         if (code !== 0) {
//           reject(new Error(`Worker stopped with exit code ${code}`));
//         }
//       });
//     });

//     const luckyArray = await workerPromise;

//     return luckyArray.length === qty ? luckyArray : "failed";
//   } catch (error) {
//     console.error("An error occurred in generating lucky Number:", error);
//     responseMethod({
//       status: "failed",
//       message: "An error occurred in generating lucky Number",
//     });
//     // throw new Error("An error occurred in generating lucky Number");
//     return "failed";
//   }
// };

// // @private
// // get all LuckyNumber
// // @access Admin
// const getAllLucky = expressAsyncHandler(async (req, res, next) => {
//   try {
//     const queryStr = { ...req.query };
//     const keyword = req.query.keyword || "";
//     delete queryStr.keyword;

//     const matchStage = {
//       $or: [
//         { code: { $regex: keyword, $options: "i" } },
//         { status: { $regex: keyword, $options: "i" } },
//         { "reward.name": { $regex: keyword, $options: "i" } },
//         { "reward.prize": { $regex: keyword, $options: "i" } },
//         { "user.name": { $regex: keyword, $options: "i" } },
//         { "presetAgent.name": { $regex: keyword, $options: "i" } },
//       ],
//     };

//     const pipeline = queryModification(Lucky, queryStr, req);

//     pipeline.push(
//       {
//         $lookup: {
//           from: "rewards",
//           localField: "reward",
//           foreignField: "_id",
//           as: "reward",
//         },
//       },
//       { $unwind: "$reward" },
//       {
//         $lookup: {
//           from: "users",
//           localField: "user",
//           foreignField: "_id",
//           as: "user",
//         },
//       },
//       { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
//       {
//         $lookup: {
//           from: "users",
//           localField: "presetAgent",
//           foreignField: "_id",
//           as: "presetAgent",
//         },
//       },
//       { $unwind: { path: "$presetAgent", preserveNullAndEmptyArrays: true } },
//       { $match: matchStage }
//     );

//     const luckies = await Lucky.aggregate(pipeline);

//     const totalCount = await Lucky.countDocuments(queryStr);

//     responseMethod(
//       { status: "succeed", data: { data: luckies, totalCount } },
//       res
//     );
//   } catch (error) {
//     console.log("getError", error.stack);
//     throw new Error(error);
//   }
// });

// // @private
// // get a random LuckyNumber from agent
// // @access User
// // GET /lucky/getRandom
// const getRandomLuckyNumber = expressAsyncHandler(async (req, res, next) => {
//   try {
//     const currentTime = new Date();
//     const checkIfUserIsPreset = await Lucky.findOne({
//       presetAgent: req.user.upLine,
//     });
//     let presetUpdatedTime;
//     if (checkIfUserIsPreset) {
//       presetUpdatedTime = new Date(checkIfUserIsPreset.outTime);
//     }
//     const allRewards = await RewardModel.find({});
//     const wheel = await WheelModel.findOne({ name: "Wheel" });
//     const givenLucky = await Lucky.findOne({
//       user: req.user.id,
//       status: "requested",
//     });
//     let updatedLucky = {};
//     if (givenLucky === null) {
//       if (
//         checkIfUserIsPreset &&
//         currentTime.getTime() >=
//           presetUpdatedTime.getTime() + 2 * 60 * 60 * 1000
//       ) {
//         updatedLucky = await Lucky.findByIdAndUpdate(
//           checkIfUserIsPreset._id,
//           { user: req.user.id, status: "requested" },
//           { new: true }
//         );
//       } else {
//         const allAvailableNumbers = await Lucky.aggregate([
//           { $match: { status: "available" } },
//           { $sample: { size: 1 } },
//         ]);
//         if (allAvailableNumbers.length === 0) {
//           updatedLucky === null;
//         } else {
//           const randomLucky = allAvailableNumbers[0];
//           updatedLucky = await Lucky.findByIdAndUpdate(
//             randomLucky._id,
//             {
//               user: req.user.id,
//               status: "requested",
//             },
//             { new: true }
//           );
//         }
//       }
//     } else {
//       updatedLucky = givenLucky;
//     }

//     if (updatedLucky) {
//       const index = allRewards.findIndex(
//         (reward) => reward._id.toString() === updatedLucky.reward.toString()
//       );
//       responseMethod(
//         {
//           status: "Succeed",
//           updatedLucky,
//           deg: Math.floor(18000 - ((index + 1) * 360) / wheel.slices),
//         },
//         res
//       );
//     } else {
//       responseMethod(
//         {
//           status: "failed",
//           updatedLucky: null,
//           message: "There is no luckyNumber available.",
//         },
//         res
//       );
//     }
//   } catch (e) {
//     console.log(e);
//     throw new Error(e);
//   }
// });

// const queryModification = (Model, queryObj, req) => {
//   const excludeFields = ["page", "sort", "limit", "fields"];
//   excludeFields.forEach((el) => delete queryObj[el]);

//   function convertKeysAndValues(obj) {
//     let newObj = {};
//     for (let [key, value] of Object.entries(obj)) {
//       if (typeof value === "object" && value !== null) {
//         for (let [innerKey, innerValue] of Object.entries(value)) {
//           let newKey = `$${innerKey}`;
//           let newValue;
//           if (newKey === "$in") {
//             newValue = innerValue.includes(",")
//               ? innerValue.split(",")
//               : [innerValue];
//           } else if (
//             newKey === "$gt" ||
//             newKey === "$lt" ||
//             newKey === "$gte" ||
//             newKey === "$lte"
//           ) {
//             newValue = isNaN(innerValue)
//               ? new Date(innerValue)
//               : Number(innerValue);
//           }
//           newObj[key] = { ...newObj[key], [newKey]: newValue };
//         }
//       } else {
//         newObj[key] = value;
//       }
//     }
//     return newObj;
//   }

//   if (queryObj?.createdAt) {
//     if (queryObj.createdAt.gte && queryObj.createdAt.lte) {
//       const gteDate = new Date(queryObj.createdAt.gte);
//       const lteDate = new Date(queryObj.createdAt.lte);
//       const currentDate = new Date();
//       if (
//         gteDate.getTime() === lteDate.getTime() ||
//         (lteDate.getDate() === currentDate.getDate() &&
//           lteDate.getMonth() === currentDate.getMonth() &&
//           lteDate.getFullYear() === currentDate.getFullYear())
//       ) {
//         lteDate.setHours(23, 59, 59, 999);
//         queryObj.createdAt = {
//           gte: queryObj.createdAt.gte,
//           lte: lteDate.toISOString(),
//         };
//       } else {
//         queryObj.createdAt = {
//           gte: queryObj.createdAt.gte,
//           lte: queryObj.createdAt.lte,
//         };
//       }
//     } else if (queryObj.createdAt.gte && !queryObj.createdAt.lte) {
//       queryObj.createdAt = { gte: queryObj.createdAt.gte };
//     }
//   }

//   let convertedObj = convertKeysAndValues(queryObj);
//   let queryStr = JSON.stringify(convertedObj);
//   let matchStage = { $match: JSON.parse(queryStr) };

//   let pipeline = [matchStage];

//   if (req.query.sort) {
//     const sortBy = req.query.sort.split(",").join(" ");
//     let sortStage = { $sort: {} };
//     sortBy.split(" ").forEach((field) => {
//       const order = field.startsWith("-") ? -1 : 1;
//       const fieldName = field.startsWith("-") ? field.substring(1) : field;
//       sortStage.$sort[fieldName] = order;
//     });
//     pipeline.push(sortStage);
//   } else {
//     pipeline.push({ $sort: { createdAt: -1 } });
//   }

//   if (req.query.fields) {
//     const fields = req.query.fields.split(",").join(" ");
//     let projectStage = { $project: {} };
//     fields.split(" ").forEach((field) => {
//       projectStage.$project[field] = 1;
//     });
//     pipeline.push(projectStage);
//   } else {
//     pipeline.push({ $project: { __v: 0 } });
//   }

//   const page = req.query.page ? parseInt(req.query.page) : 1;
//   const limit = req.query.limit ? parseInt(req.query.limit) : 10;
//   const skip = (page - 1) * limit;

//   pipeline.push({ $skip: skip });
//   pipeline.push({ $limit: limit });

//   return pipeline;
// };

// module.exports = {
//   getAllLucky,
//   generateLucky,
//   getRandomLuckyNumber,
// };

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

module.exports = {
  generateLucky,
};
// Example usage
// generateLucky(10000, 'reward123')
//   .then(result => console.log('Generation completed:', result.length === 10000 ? 'success' : 'failed'))
//   .catch(error => console.error('Generation error:', error));
