import userModel from "@models/users.model";

exports.findMany = async (
  filter = {},
  select = ["-updatedAt"],
  populate = null,

  limit = 0,
  sort = { createdAt: -1 }
) => {
  try {
    if (populate) {
      return await userModel
        .find(filter, select)
        .populate(populate)
        .sort(sort)
        .limit(limit);
    } else {
      return await userModel
        .find(filter)
        .sort(sort)
        .limit(limit)
        .select(select);
    }
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    throw err;
  }
};
exports.getIds = async (filter = {}) => {
  try {
    return await userModel.find(filter).distinct("_id");
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    throw err;
  }
};

exports.findUser = async (
  filter = {},
  select = ["-updatedAt"],
  populate = null
) => {
  try {
    if (populate) {
      return await userModel.findOne(filter, select).populate(populate);
    } else {
      return await userModel.findOne(filter, select);
    }
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    throw err;
  }
};

exports.create = async (doc) => {
  try {
    let model = await new userModel(doc);
    await model.save();
    return model;
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    throw err;
  }
};

exports.update = async (filter, update) => {
  try {
    await userModel.updateOne(filter, update);
    return true;
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    throw err;
  }
};

exports.createOrUpdateUser = async (filter, update) => {
  try {
    return await userModel.updateOne(filter, update, { upsert: true });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    throw err;
  }
};
