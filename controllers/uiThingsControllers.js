const expressAsyncHandler = require("express-async-handler");
const UiThingsModel = require("../models/UiThingsModel");
const {
  postModifyMethod,
  postCreateMethod,
  getMethod,
} = require("../services/query");
const { responseMethod } = require("../utils/response");

exports.modifyUiThings = expressAsyncHandler(async (req, res, next) => {
  console.log(req.body);
  try {
    const exist = await UiThingsModel.findOne({
      settingName: req.body.settingName,
    });
    let newUiThing;
    if (exist) {
      console.log("first");
      if (req.body?.topName || req.body?.text) {
        newUiThing = await postModifyMethod(UiThingsModel, req.body, exist);
      } else {
        newUiThing = await UiThingsModel.findByIdAndUpdate(
          exist._id,
          {
            $push: { moreNames: req.body.moreName },
          },
          { new: true }
        );
      }
    } else {
      newUiThing = await postCreateMethod(UiThingsModel, req.body);
    }
    responseMethod(
      {
        status: "succeed",
        data: newUiThing,
      },
      res
    );
  } catch (error) {
    throw new Error(error);
  }
});

exports.getUiThing = expressAsyncHandler(async (req, res, next) => {
  try {
    const queryStr = { ...req.query };
    const uiThings = await getMethod(UiThingsModel, queryStr, req);
    responseMethod(
      {
        status: "succeed",
        data: uiThings,
      },
      res
    );
  } catch (error) {
    throw new Error(error);
  }
});

exports.getTop10 = expressAsyncHandler(async (req, res, next) => {
  try {
    const top10 = await UiThingsModel.find({ topName: { $exists: true } });
    responseMethod(
      {
        status: "succeed",
        data: top10,
      },
      res
    );
  } catch (error) {
    throw new Error(error);
  }
});
exports.getMoreWinners = expressAsyncHandler(async (req, res, next) => {
  try {
    const moreWinners = await UiThingsModel.findOne({
      settingName: "More Winner",
    });
    console.log(moreWinners);
    if (!moreWinners) {
      throw new Error("MoreWinners not found");
    }
    responseMethod({ status: "succeed", data: moreWinners }, res);
  } catch (error) {
    throw new Error(error);
  }
});
