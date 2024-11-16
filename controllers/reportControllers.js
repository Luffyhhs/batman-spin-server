const expressAsyncHandler = require("express-async-handler");
const ReportModel = require("../models/ReportModel");
const { getMethod } = require("../services/query");
const { responseMethod } = require("../utils/response");
const { queryModification } = require("../utils/queryModification");
const mongoose = require("mongoose");
const { ObjectId } = mongoose.Types;

exports.getAllReport = expressAsyncHandler(async (req, res, next) => {
  try {
    const queryStr = { ...req.query };
    const rewardPopulateOptions = { path: "reward", model: "Reward" };
    const agentPopulateOptions = { path: "agent", model: "User" };
    const userPopulateOptions = { path: "user", model: "User" };
    if (req.query?.reward) {
      rewardPopulateOptions.match = {
        name: req.query.reward,
      };
    }
    if (req.query?.agent) {
      agentPopulateOptions.match = {
        _id: req.query.agent,
      };
    }
    if (req.query?.user) {
      userPopulateOptions.match = {
        name: req.query.user,
      };
    }
    if (req.user.role === "Agent") {
      userPopulateOptions.match = {
        ...userPopulateOptions.match,
        upLine: req.user.id,
      };
    }

    const query = queryModification(ReportModel, queryStr, req);
    let reports = [];
    // check if queryStr has other query that page and limit,
    const { page, limit, ...rest } = req.query;
    let totalCount = await ReportModel.countDocuments(rest);

    const populateOptions = [
      rewardPopulateOptions,
      userPopulateOptions,
      agentPopulateOptions,
      { path: "lucky", model: "LuckyNumber" },
    ];
    if (req.user.role === "Admin") {
      reports = await query.populate(populateOptions);
    } else if (req.user.role === "Agent") {
      reports = await query.populate(populateOptions);
      reports = reports.filter(
        (report) =>
          report?.user &&
          report?.user?.upLine?.toString() === req.user.id.toString()
      );
    } else {
      reports = await query.populate(populateOptions);
      reports = reports.filter(
        (report) => report?.user?._id?.toString() === req.user.id.toString()
      );
      totalCount = reports.length;
    }
    responseMethod(
      { status: "succeed", data: { data: reports, totalCount } },
      res
    );
  } catch (error) {
    console.log(error.stack);
    throw new Error(error);
  }
});

exports.updateReport = expressAsyncHandler(async (req, res, next) => {
  try {
    const updatedReport = await ReportModel.findByIdAndUpdate(
      req.body.id,
      {
        gaveToUser: true,
      },
      { new: true }
    );
    // console.log(updatedReport)
    res.status(200).json({
      status: "succeed",
      data: updatedReport,
    });
  } catch (e) {
    throw new Error(e);
  }
});

exports.deleteReport = async (deletedRewardId) => {
  const deletedReport = await ReportModel.deleteMany({
    reward: deletedRewardId,
  });
  return deletedReport;
};

// Your existing query modification function
// const queryStr = { ...req.query };
// const query = queryModification(ReportModel, queryStr, req);

// const rewardPopulateOptions = { path: "reward", model: "Reward" };
// const agentPopulateOptions = { path: "agent", model: "User" };
// const userPopulateOptions = { path: "user", model: "User" };

// if (req.query?.reward) {
//   rewardPopulateOptions.match = {
//     name: req.query.reward,
//   };
// }

// if (req.query?.agent) {
//   agentPopulateOptions.match = {
//     _id: req.query.agent,
//   };
// }

// if (req.query?.user) {
//   userPopulateOptions.match = {
//     name: req.query.user,
//   };
// }

// if (req.user.role === "Agent") {
//   userPopulateOptions.match = {
//     ...userPopulateOptions.match,
//     upLine: req.user.id,
//   };
// }

// const aggregatePipeline = [
//   { $match: query._conditions }, // Use the conditions from your query object
//   {
//     $lookup: {
//       from: "rewards",
//       localField: "reward",
//       foreignField: "_id",
//       as: "reward",
//     },
//   },
//   {
//     $lookup: {
//       from: "users",
//       localField: "agent",
//       foreignField: "_id",
//       as: "agent",
//     },
//   },
//   {
//     $lookup: {
//       from: "users",
//       localField: "user",
//       foreignField: "_id",
//       as: "user",
//     },
//   },
//   { $unwind: "$reward" },
//   { $unwind: "$agent" },
//   { $unwind: "$user" },
//   {
//     $lookup: {
//       from: "luckynumbers",
//       localField: "lucky",
//       foreignField: "_id",
//       as: "lucky",
//     },
//   },
//   { $unwind: { path: "$lucky", preserveNullAndEmptyArrays: true } },
// ];

// if (req.query?.reward) {
//   aggregatePipeline.push({
//     $match: { "reward.name": req.query.reward },
//   });
// }

// if (req.query?.user) {
//   aggregatePipeline.push({
//     $match: { "user.name": req.query.user },
//   });
// }

// const { page, limit, ...rest } = req.query;
// let totalCount = await ReportModel.aggregate([
//   { $match: rest },
//   { $count: "count" },
// ]);

// let reports = await ReportModel.aggregate(aggregatePipeline);

// if (req.user.role === "Agent") {
//   reports = reports.filter(
//     (report) => report.user.upLine.toString() === req.user.id.toString()
//   );
// } else if (req.user.role !== "Admin") {
//   reports = reports.filter(
//     (report) => report.user._id.toString() === req.user.id.toString()
//   );
//   totalCount = reports.length;
// }

// responseMethod({ status: "succeed", data: { data: reports, totalCount } }, res);
