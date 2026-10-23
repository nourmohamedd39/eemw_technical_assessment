const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

// Find the uploads folder inside backend
const uploadDirectory = process.env.UPLOAD_DIRECTORY
  ? path.resolve(process.env.UPLOAD_DIRECTORY)
  : path.join(__dirname, "../../uploads");

// Create the folder automatically if it doesn't exist
fs.mkdirSync(uploadDirectory, { recursive: true });

// Configure where and how files are saved
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirectory);
  },

  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname);
    const uniqueName = crypto.randomUUID() + extension;

    cb(null, uniqueName);
  },
});

// Limit file size to the assessment maximum of 25 MB
const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = [".pdf", ".docx", ".txt", ".xlsx"];
    const extension = path.extname(file.originalname).toLowerCase();

    if (!allowedExtensions.includes(extension)) {
      return cb(new Error("Unsupported file type"));
    }

    cb(null, true);
  },
});

module.exports = upload;
