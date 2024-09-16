const express = require("express");
const app = express();
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { errorHandler, notFound } = require("./middlewares/ErrorMiddlewares");
const AdsRouter = require("./routes/adsRoute");
const RewardsRouter = require("./routes/rewardsRoute");
const WheelRouter = require("./routes/wheelRoute");
const UserRouter = require("./routes/userRoute");
const LuckyRouter = require("./routes/luckyRoute");
const UiThingRouter = require("./routes/uiThingsRoute");
const ReportRouter = require("./routes/reportRoute");
const LotteryRouter = require("./routes/lotteryRoute");

app.use(cors());
app.use(express.json()); // Parses JSON bodies
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static("public"));
app.use((req, res, next) => {
  //   console.log(req.headers);
  next();
});
app.use("/", (req, res) => {
  res.send({
    status: "success",
    message: "Server is up and running!",
  });
});
app.use("/user", UserRouter);
app.use("/reward", RewardsRouter);
app.use("/ads", AdsRouter);
app.use("/wheel", WheelRouter);
app.use("/lucky", LuckyRouter);
app.use("/lottery", LotteryRouter);
app.use("/uiThing", UiThingRouter);
app.use("/report", ReportRouter);

app.use(errorHandler);
app.use(notFound);
module.exports = app;
