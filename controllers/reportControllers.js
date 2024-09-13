const expressAsyncHandler = require("express-async-handler");
const ReportModel = require("../models/ReportModel");
const { getMethod } = require("../services/query");
const { responseMethod } = require("../utils/response");

exports.getAllReport = expressAsyncHandler(async (req, res, next) => {
  try {
    const queryStr = { ...req.query };
    const reports = await getMethod(ReportModel, queryStr, req);
    responseMethod({ status: "succeed", data: reports }, res);
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
