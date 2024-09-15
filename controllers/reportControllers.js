const expressAsyncHandler = require("express-async-handler");
const ReportModel = require("../models/ReportModel");
const { getMethod } = require("../services/query");
const { responseMethod } = require("../utils/response");
const { queryModification } = require("../utils/queryModification");

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
      { path: "lucky", model: "Lucky" },
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
