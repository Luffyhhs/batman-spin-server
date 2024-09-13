exports.queryModification = (Model, queryObj, req) => {
  const excludeFields = ["page", "sort", "limit", "fields"];
  excludeFields.forEach((el) => delete queryObj[el]);

  function convertKeysAndValues(obj) {
    let newObj = {};
    for (let [key, value] of Object.entries(obj)) {
      if (typeof value === "object" && value !== null) {
        for (let [innerKey, innerValue] of Object.entries(value)) {
          let newKey = `$${innerKey}`;
          let newValue;
          if (newKey === "$in") {
            newValue = innerValue.includes(",")
              ? innerValue.split(",")
              : [innerValue];
          } else if (
            newKey === "$gt" ||
            newKey === "$lt" ||
            newKey === "$gte" ||
            newKey === "$lte"
          ) {
            newValue = isNaN(innerValue)
              ? new Date(innerValue)
              : Number(innerValue);
          }
          newObj[key] = { ...newObj[key], [newKey]: newValue };
        }
      } else {
        newObj[key] = value;
      }
    }
    return newObj;
  }

  if (queryObj?.createdAt) {
    if (queryObj.createdAt.gte && queryObj.createdAt.lte) {
      const gteDate = new Date(queryObj.createdAt.gte);
      const lteDate = new Date(queryObj.createdAt.lte);
      const currentDate = new Date();
      if (
        gteDate.getTime() === lteDate.getTime() ||
        (lteDate.getDate() === currentDate.getDate() &&
          lteDate.getMonth() === currentDate.getMonth() &&
          lteDate.getFullYear() === currentDate.getFullYear())
      ) {
        lteDate.setHours(23, 59, 59, 999);
        queryObj.createdAt = {
          gte: queryObj.createdAt.gte,
          lte: lteDate.toISOString(),
        };
      } else {
        queryObj.createdAt = {
          gte: queryObj.createdAt.gte,
          lte: queryObj.createdAt.lte,
        };
      }
    } else if (queryObj.createdAt.gte && !queryObj.createdAt.lte) {
      queryObj.createdAt = { gte: queryObj.createdAt.gte };
    }
  }

  let convertedObj = convertKeysAndValues(queryObj);
  let queryStr = JSON.stringify(convertedObj);
  let query = Model.find(JSON.parse(queryStr));

  if (req.query.sort) {
    const sortBy = req.query.sort.split(",").join(" ");
    query = query.sort(sortBy);
  } else {
    query = query.sort("-createdAt");
  }

  if (req.query.fields) {
    const fields = req.query.fields.split(",").join(" ");
    query = query.select(fields);
  } else {
    query = query.select("-__v");
  }

  const page = req.query.page;
  const limit = req.query.limit;
  const skip = (page - 1) * limit;
  query = query.skip(skip).limit(limit);

  return query;
};
