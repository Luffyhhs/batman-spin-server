const { default: mongoose } = require("mongoose");
const { responseMethod } = require("./response");

exports.checkExist = async (model, data, res) => {
  const exist = await model.findOne(data);
  console.log(exist);
  if (exist) {
    return exist;
  } else {
    responseMethod(
      { status: "failed", message: "This User doesn't exist." },
      res
    );
  }
  return null;
};

exports.validateMongodbId = (id) => {
  const isValid = mongoose.Types.ObjectId.isValid(id);
  if (!isValid) {
    throw new Error("This Id is not valid or not found.");
  }
};
