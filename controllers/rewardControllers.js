const expressAsyncHandler = require("express-async-handler");
const Reward = require("../models/RewardModel");
const {
  postModifyMethod,
  postCreateMethod,
  getMethod,
  deleteMethod,
} = require("../services/query");
const { responseMethod } = require("../utils/response");
const {
  generateLucky,
  modifyLuckyByRewardQuantity,
  deleteLucky,
} = require("./luckyNumberControllers");
const { deleteReport } = require("./reportControllers");
const WheelModel = require("../models/WheelModel");
// const { generateLucky } = require("./test");

exports.modifyRewards = expressAsyncHandler(async (req, res) => {
  // console.log(req.body);
  try {
    const exist = await Reward.findOne({ name: req.body.name });
    if (exist) {
      const updatedReward = await postModifyMethod(Reward, req.body, exist);
      // console.log(updatedReward);
      if (exist.quantity !== updatedReward.quantity) {
        await modifyLuckyByRewardQuantity(
          updatedReward._id,
          updatedReward.quantity
        );
      }
      responseMethod(
        {
          status: "succeed",
          data: updatedReward,
        },
        res
      );
    } else {
      const WheelObj = await WheelModel.findOne({ name: "Wheel" });
      const AllReward = await Reward.find({});
      if (AllReward.length >= WheelObj.slices) {
        throw new Error("No more reward can be created");
      } else {
        const newReward = await postCreateMethod(Reward, req.body);
        const generate = await generateLucky(newReward.quantity, newReward._id);
        if (generate === "failed") {
          await deleteMethod(Reward, newReward._id);
          throw new Error("Error in generating randomCodes");
        }
        // console.log(generate);
        responseMethod(
          {
            status: "succeed",
            data: newReward,
          },
          res
        );
      }
    }
  } catch (error) {
    // console.error(error);
    throw new Error(error);
  }
});

exports.getRewards = expressAsyncHandler(async (req, res) => {
  try {
    const queryStr = { ...req.query };
    const allRewards = await getMethod(Reward, queryStr, req);
    responseMethod(
      {
        status: "succeed",
        data: allRewards,
      },
      res
    );
  } catch (error) {
    throw new Error(error);
  }
});

exports.deleteReward = expressAsyncHandler(async (req, res) => {
  try {
    const deletedReward = await deleteMethod(Reward, req.params.id);
    await deleteLucky(req.params.id);
    await deleteReport(req.params.id);
    responseMethod({ status: "succeed", data: deletedReward }, res);
  } catch (error) {
    throw new Error(error);
  }
});
