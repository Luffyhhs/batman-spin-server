const { Upload } = require("@aws-sdk/lib-storage");
const { S3 } = require("@aws-sdk/client-s3");

const multer = require("multer");
require("dotenv").config({ path: "./.env.development" });
const fs = require("fs");
const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/tempUploads");
  },
  filename: function (req, file, cb) {
    // console.log(file,req.file,'12')
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = file.mimetype.split("/")[1];
    cb(null, `${file.fieldname}-${uniqueSuffix}.${ext}`);
  },
});
const upload = multer({ storage: multerStorage });
// JS SDK v3 does not support global configuration.
// Codemod has attempted to pass values to each service client in this file.
// You may need to update clients outside of this file, if they use global config.

const s3 = new S3({
  credentials: {
    accessKeyId: process.env.DO_SPACE_ACCESS_KEY_ID,
    secretAccessKey: process.env.DO_SPACE_SECRET_ACCESS_KEY,
  },
  region: process.env.DO_SPACE_REGION,
  endpoint: process.env.DO_SPACE_REG_ENDPOINT,
});
let uploadTemp = upload.single("img");
const uploadTempMiddleware = (req, res, next) => {
  if (req.is("multipart/form-data")) {
    upload.single("img")(req, res, (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({
          status: "failed",
          message: "Error uploading file!",
        });
      }
      next();
    });
  } else {
    upload.none()(req, res, next);
  }
};
const uploadToSpace = async (req, res, next) => {
  //   console.log(req.is("multipart/form-data"), req, " line 50");
  if (!req.is("multipart/form-data")) {
    next();
  } else {
    const file = req.file;
    // console.log(file)
    const params = {
      Bucket: process.env.DO_SPACE_BUCKET,
      Key: `lucky/${file.filename}`,
      Body: fs.createReadStream(file.path),
      // ContentDisposition: "inline",
      ACL: "public-read",
    };
    try {
      const uploadedFile = await new Upload({
        client: s3,
        params,
      }).done();
      // console.log(uploadedFile, "line 59");
      req.uploadedFile = uploadedFile;
      req.uploadedFile = {
        Key: uploadedFile.Key,
        Bucket: uploadedFile.Bucket,
        Location: `${process.env.DO_SPACE_SUB_DOMAIN_ENDPOINT}/${uploadedFile.Key}`,
      };
      next();
    } catch (error) {
      console.error(error);
      res.status(500).json({
        status: "failed",
        message: "Error uploading file!",
      });
    } finally {
      fs.unlink(file.path, (err) => {
        if (err) console.error(err);
      });
    }
  }
};

const deleteFromSpace = async (fileName) => {
  const params = {
    Bucket: process.env.DO_SPACE_BUCKET,
    Key: `${fileName}`, // Include folder path if applicable
  };

  try {
    await s3.deleteObject(params);
    console.log(`File ${fileName} deleted successfully.`);
  } catch (error) {
    console.error("Error deleting file:", error);
    // Handle deletion errors (e.g., file not found)
    res.json({
      status: "failed",
      message: "Error deleting file!",
    });
  }
};

module.exports = { uploadToSpace, uploadTempMiddleware, deleteFromSpace };
