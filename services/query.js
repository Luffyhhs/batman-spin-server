const { deleteFromSpace } = require("../middlewares/uploadMiddleware");
const { queryModification } = require("../utils/queryModification");
const User = require("../models/User");
const Ads = require("../models/AdsModel");
const Reward = require("../models/RewardModel");
const Lucky = require("../models/LuckyNumberModel");
const Report = require("../models/ReportModel");
const Limit = require("../models/LimitModel");

let Model;
exports.getMethod = async (model, queryStr, req) => {
  // console.log(`Error while fetching `, model);

  try {
    // do query modify and return
    const query = await queryModification(model, queryStr, req);
    return await query;
  } catch (error) {
    throw new Error(error);
  }
};

exports.postModifyMethod = async (model, updateData, existingData) => {
  try {
    const updatedData = await model
      .findByIdAndUpdate(
        existingData._id,
        {
          ...updateData,
        },
        { new: true }
      )
      .select("-__v");
    // console.log(existingData,updateData.url !== null,updateData)
    if (existingData?.url !== null && updateData?.url !== undefined) {
      const existUrl = existingData.url.split("/");
      deleteFromSpace(
        existUrl.length > 4
          ? existUrl.slice(3).join("/")
          : existUrl[existUrl.length - 1]
      );
    }
    return updatedData;
  } catch (error) {
    throw new Error(error);
  }
};

exports.postCreateMethod = async (model, body) => {
  try {
    const newData = await model.create({
      ...body,
    });
    return newData;
  } catch (error) {
    throw new Error(error);
  }
};

exports.putMethod = async (id, body, model) => {
  try {
    const updatedData = await model.findByIdAndUpdate(
      id,
      {
        ...body,
      },
      { new: true }
    );
    return updatedData;
  } catch (error) {
    throw new Error(error);
  }
};

exports.patchMethod = () => {};

exports.deleteMethod = async (model, id) => {
  try {
    const deletedData = await model.findByIdAndDelete(id);
    return deletedData;
  } catch (error) {
    throw new Error(error);
  }
};

exports.randomDeleteLuckyWithStatus = async (model, qty, reward) => {
  console.log(qty, "delete qty");
  let cur = 0;
  const availableCodes = await model.find(
    { reward: reward },
    {
      status: "available",
    }
  );
  try {
    while (cur < qty) {
      let randomIndex = Math.floor(Math.random() * availableCodes.length);
      let random = availableCodes.splice(randomIndex, 1)[0];
      // availableCodes[randomIndex];

      await model.findByIdAndDelete(random._id);
      cur++;
      console.log(cur);
    }
  } catch (error) {
    throw new Error(error);
  }
};
