exports.responseMethod = (obj, res) => {
  try {
    res.send(obj);
  } catch (error) {
    throw new Error(error);
  }
};
