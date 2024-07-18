const app = require("./app");
const dotenv = require("dotenv");
const { dbConnect } = require("./config/dbConnect");
dotenv.config({ path: "./.env.development" });
dbConnect();
const port = process.env.PORT || 3000;
app.listen(port, () => console.log("server listening at", port));
