const { parentPort } = require("worker_threads");
const mongoose = require("mongoose");
const crypto = require("crypto");

// Define your Mongoose model for the lucky codes
const LuckyCode = mongoose.model(
  "LuckyCode",
  new mongoose.Schema({
    code: { type: String, unique: true },
    reward: String,
  })
);

// Function to generate a random string
function generateRandomString() {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";

  let randomLetters = "";
  let randomNumbers = "";

  for (let i = 0; i < 2; i++) {
    randomLetters += alphabet.charAt(crypto.randomInt(0, alphabet.length));
  }

  for (let i = 0; i < 8; i++) {
    randomNumbers += numbers.charAt(crypto.randomInt(0, numbers.length));
  }

  return randomLetters + randomNumbers;
}

// Function to check if a string exists in the database
async function isStringUnique(code) {
  const existingCode = await LuckyCode.findOne({ code });
  return !existingCode;
}

parentPort.on("generateStrings", async ({ qty, id, dbUri }) => {
  // Connect to the database
  await mongoose.connect(dbUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const generatedStrings = new Set();

  while (generatedStrings.size < qty) {
    const randomString = generateRandomString();

    if (await isStringUnique(randomString)) {
      generatedStrings.add(randomString);
    }
  }

  const luckyObjects = Array.from(generatedStrings).map((string) => ({
    code: string,
    reward: id,
  }));

  // Save the new codes to the database
  await LuckyCode.insertMany(luckyObjects);

  // Disconnect from the database
  await mongoose.disconnect();

  parentPort.postMessage(luckyObjects);
});
