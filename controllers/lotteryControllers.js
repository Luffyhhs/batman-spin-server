const expressAsyncHandler = require("express-async-handler");
const { queryModification } = require("../utils/queryModification");
const LotteryModel = require("../models/LotteryModel");
const { responseMethod } = require("../utils/response");
// @private
// get all lottery

// @access Admin
const getAllLottery = expressAsyncHandler(async (req, res, next) => {
  try {
    const queryStr = { ...req.query };
    const query = queryModification(LotteryModel, queryStr, req);
    const lotteries = await query;
    responseMethod(
      {
        status: "succeed",
        date: lotteries,
      },
      res
    );
  } catch (error) {
    throw new Error(error);
  }
});
const modifyLottery = expressAsyncHandler(async (req, res, next) => {
  const exist = await LotteryModel.findById(req.params.id);
  try {
    if (exist) {
    } else {
      throw new Error("There is no Lottery with this Id.");
    }
  } catch (error) {
    throw new Error(error);
  }
});

module.exports = { getAllLottery, modifyLottery };
