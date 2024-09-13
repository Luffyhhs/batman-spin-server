const expressAsyncHandler = require("express-async-handler");
const Ads = require("../models/AdsModel");
const { deleteFromSpace } = require("../middlewares/uploadMiddleware");
const {
  getMethod,
  postModifyMethod,
  postCreateMethod,
  deleteMethod,
} = require("../services/query");
const { responseMethod } = require("../utils/response");
exports.modifyAds = expressAsyncHandler(async (req, res) => {
  const exist = await Ads.findOne({ name: req.body.name });
  try {
    // console.log(req.uploadedFile);
    if (exist) {
      // console.log(exist);
      const updatedBody = {
        name: req.body.name,
        url: req.uploadedFile.Location,
      };
      const updatedAds = await postModifyMethod(Ads, updatedBody, exist);
      // console.log(updatedAds, "updatedAds");
      responseMethod(
        {
          status: "succeed",
          data: updatedAds,
        },
        res
      );
    } else {
      const newBody = {
        name: req.body.name,
        url: req.uploadedFile.Location,
      };
      const newAds = await postCreateMethod(Ads, newBody);
      responseMethod(
        {
          status: "succeed",
          data: newAds,
        },
        res
      );
    }
  } catch (error) {
    deleteFromSpace(req.uploadedFile.Key);
    throw new Error(error);
  }
});
exports.getAds = expressAsyncHandler(async (req, res) => {
  try {
    // const allAds = await Ads.find({});
    const queryStr = req.query;
    const allAds = await getMethod(Ads, queryStr, req);
    responseMethod(
      {
        status: "succeed",
        data: allAds,
      },
      res
    );
  } catch (error) {
    throw new Error(error);
  }
});

exports.deleteAds = expressAsyncHandler(async (req, res) => {
  try {
    await deleteMethod(Ads, req.params.id);
    responseMethod(
      {
        status: "succeed",
        message: "Ads Delete Successfully",
      },
      res
    );
    // res.status(200);
  } catch (error) {
    throw new Error(error);
  }
});
