import followModel from "@models/follow.model";

exports.findMany = async (
  filter = {},
  select = ["-updatedAt"],
  populate = null,

  limit = 0,
  sort = { createdAt: -1 }
) => {
  try {
    if (populate) {
      return await followModel
        .find(filter, select)
        .populate(populate)
        .sort(sort)
        .limit(limit);
    } else {
      return await followModel
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
    return await followModel.find(filter).distinct("_id");
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    throw err;
  }
};

exports.find = async (
  filter = {},
  select = ["-updatedAt"],
  populate = null
) => {
  try {
    if (populate) {
      return await followModel.findOne(filter, select).populate(populate);
    } else {
      return await followModel.findOne(filter, select);
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
    let model = await new followModel(doc);
    await model.save();
    return model;
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    throw err;
  }
};

exports.remove = async (filter) => {
  try {
    await followModel.deleteOne(filter);
    return true;
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    throw err;
  }
};

exports.update = async (filter, update) => {
  try {
    await followModel.updateOne(filter, update);
    return true;
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    throw err;
  }
};

exports.createOrUpdate = async (filter, update) => {
  try {
    return await followModel.updateOne(filter, update, { upsert: true });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    throw err;
  }
};
