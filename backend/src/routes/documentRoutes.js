const express = require("express");
const fs = require("fs/promises");
const multer = require("multer");
const upload = require("../middleware/upload");
const {
  createDocument,
  searchDocuments,
  getDocument,
  downloadDocument,
  downloadDocumentVersion,
  uploadDocumentVersion,
  getVersionHistory,
  compareDocumentVersions,
} = require("../controllers/documentController");

const router = express.Router();

// Multer errors happen before the controller runs, so normalize them here.
const handleUpload = (req, res, next) => {
  upload.single("file")(req, res, async (error) => {
    if (!error) {
      return next();
    }

    if (req.file?.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        console.error("Could not remove rejected upload:", cleanupError);
      }
    }

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        message: "The uploaded file exceeds the maximum size of 25 MB.",
      });
    }

    if (error.message === "Unsupported file type") {
      return res.status(400).json({
        message: "Unsupported file type. Allowed types are PDF, DOCX, TXT, and XLSX.",
      });
    }

    if (error instanceof multer.MulterError) {
      return res.status(400).json({
        message: `Upload error: ${error.message}`,
      });
    }

    return next(error);
  });
};

router.post("/", handleUpload, createDocument);
router.get("/", searchDocuments);
router.post("/:id/versions", handleUpload, uploadDocumentVersion);
router.get("/:id/versions", getVersionHistory);
router.get("/:id/versions/:versionNumber/download", downloadDocumentVersion);
router.get("/:id/compare", compareDocumentVersions);
router.get("/:id/download", downloadDocument);
router.get("/:id", getDocument);

module.exports = router;
