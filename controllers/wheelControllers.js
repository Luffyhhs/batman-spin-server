const expressAsyncHandler = require("express-async-handler");
const Wheel = require("../models/WheelModel");
const { responseMethod } = require("../utils/response");
const {
  postCreateMethod,
  postModifyMethod,
  getMethod,
} = require("../services/query");

exports.modifyWheel = expressAsyncHandler(async (req, res) => {
  try {
    const exist = await Wheel.findOne({ name: req.body.name });
    if (exist) {
      let updatedBody = {
        ...req.body,
      };
      req?.uploadedFile ? (updatedBody.url = req.uploadedFile.Location) : null;
      const updatedWheel = await postModifyMethod(Wheel, updatedBody, exist);
      responseMethod(
        {
          status: "succeed",
          data: updatedWheel,
        },
        res
      );
    } else {
      const newBody = {
        ...req.body,
        url: req.uploadedFile.Location,
      };
      const newWheel = await postCreateMethod(Wheel, newBody);
      responseMethod(
        {
          status: "succeed",
          data: newWheel,
        },
        res
      );
    }
  } catch (error) {
    throw new Error(error);
  }
});

exports.getWheel = expressAsyncHandler(async (req, res) => {
  try {
    const queryStr = req.query;
    const wheel = await getMethod(Wheel, queryStr, req);
    responseMethod(
      {
        status: "succeed",
        data: wheel,
      },
      res
    );
  } catch (error) {
    throw new Error(error);
  }
});
