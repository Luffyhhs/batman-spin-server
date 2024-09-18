const { parentPort } = require("node:worker_threads");
const {
  generateRandomString,
  checkCodeAvailability,
} = require("../controllers/luckyNumberControllers"); // Adjust the path to your utility functions

parentPort.on("message", async ({ qty }) => {
  const generatedStrings = new Set();

  while (generatedStrings.size < qty) {
    const randomString = await generateRandomString();
    if (!generatedStrings.has(randomString)) {
      const codeAvailable = await checkCodeAvailability(randomString);
      if (codeAvailable) {
        generatedStrings.add(randomString);
      }
    }
  }

  parentPort.postMessage(Array.from(generatedStrings));
});
