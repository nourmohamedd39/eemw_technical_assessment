
const fs = require("fs/promises");
const documentService = require("../services/documentService");
const versionComparisonService = require("../services/versionComparisonService");

const createDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "Please select a file to upload.",
      });
    }

    const document = await documentService.createDocument(
      req.body,
      req.file,
      getDemoUserId(req)
    );

    return res.status(201).json({
      message: "Document uploaded successfully.",
      document,
    });
  } catch (error) {
    // Remove the uploaded file if validation or saving fails
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        console.error("Could not remove uploaded file:", cleanupError);
      }
    }

    console.error("Document upload error:", error);

    return res.status(error.status || 500).json({
      message:
        error.status
          ? error.message
          : "An unexpected error occurred while uploading the document.",
      ...(error.existingDocumentId ? {
        existingDocument: {
          id: error.existingDocumentId,
          title: error.existingDocumentTitle,
          version: error.existingDocumentVersion,
        },
      } : {}),
    });
  }
};

const getDemoUserId = (req) => req.get("x-demo-user-id");

const handleReadError = (res, error) => {
  console.error("Document read error:", error);

  return res.status(error.status || 500).json({
    message: error.status
      ? error.message
      : "An unexpected error occurred while reading the document.",
  });
};

const searchDocuments = async (req, res) => {
  try {
    const result = await documentService.searchDocuments(
      req.query,
      getDemoUserId(req)
    );

    return res.status(200).json({
      documents: result.documents,
      pagination: {
        limit: Number(req.query.limit || 50),
        offset: Number(req.query.offset || 0),
        total: result.total,
      },
    });
  } catch (error) {
    return handleReadError(res, error);
  }
};

const getDocument = async (req, res) => {
  try {
    const result = await documentService.getDocument(
      req.params.id,
      getDemoUserId(req)
    );

    return res.status(200).json({
      document: {
        id: result.document.id,
        title: result.document.title,
        description: result.document.description,
        uploaderId: result.document.uploader_id,
        uploaderName: result.document.uploader_name,
        uploaderEmail: result.document.uploader_email,
        isRestricted: result.document.is_restricted,
        createdAt: result.document.created_at,
        latestVersion: result.document.latest_version,
        latestFilename: result.document.latest_filename,
        latestFileSize: result.document.latest_file_size,
        latestUploadedAt: result.document.latest_uploaded_at,
      },
      tags: result.tags,
      permissions: result.permissions,
      versions: result.versions,
    });
  } catch (error) {
    return handleReadError(res, error);
  }
};

const downloadDocument = async (req, res) => {
  try {
    const download = await documentService.getDocumentDownload(
      req.params.id,
      getDemoUserId(req)
    );

    return res.download(
      download.filePath,
      download.originalFilename,
      (error) => {
        if (error && !res.headersSent) {
          return handleReadError(res, error);
        }

        return undefined;
      }
    );
  } catch (error) {
    return handleReadError(res, error);
  }
};

const removeUploadedFile = async (file) => {
  if (!file) {
    return;
  }

  try {
    await fs.unlink(file.path);
  } catch (cleanupError) {
    console.error("Could not remove uploaded version:", cleanupError);
  }
};

const uploadDocumentVersion = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "Please select a file to upload.",
      });
    }

    const version = await documentService.uploadDocumentVersion(
      req.params.id,
      req.file,
      getDemoUserId(req)
    );

    return res.status(201).json({
      message: "Document version uploaded successfully.",
      version,
    });
  } catch (error) {
    await removeUploadedFile(req.file);

    console.error("Document version upload error:", error);

    return res.status(error.status || 500).json({
      message: error.status
        ? error.message
        : "An unexpected error occurred while uploading the document version.",
    });
  }
};

const getVersionHistory = async (req, res) => {
  try {
    const history = await documentService.getVersionHistory(
      req.params.id,
      getDemoUserId(req)
    );

    return res.status(200).json(history);
  } catch (error) {
    return handleReadError(res, error);
  }
};

const compareDocumentVersions = async (req, res) => {
  try {
    const comparison = await versionComparisonService.compareVersions(
      req.params.id,
      req.query,
      getDemoUserId(req)
    );

    return res.status(200).json(comparison);
  } catch (error) {
    return handleReadError(res, error);
  }
};

module.exports = {
  createDocument,
  searchDocuments,
  getDocument,
  downloadDocument,
  uploadDocumentVersion,
  getVersionHistory,
  compareDocumentVersions,
};
