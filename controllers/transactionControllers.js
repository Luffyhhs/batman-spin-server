const expressAsyncHandler = require("express-async-handler");
const { postCreateMethod, getMethod } = require("../services/query");
const TransactionModel = require("../models/TransactionModel");
const { responseMethod } = require("../utils/response");

exports.createTransaction = expressAsyncHandler(async (obj) => {
  try {
    const newTransaction = await postCreateMethod(TransactionModel, obj);
  } catch (error) {
    throw new Error(error);
  }
});

exports.getTransactions = expressAsyncHandler(async (req, res, next) => {
  try {
    const queryStr = req.query;
    const transactions = await getMethod(TransactionModel, queryStr, req);
    responseMethod(transactions, res);
  } catch (error) {
    throw new Error(error);
  }
});
