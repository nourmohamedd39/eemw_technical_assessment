"use client";

import { useState } from "react";
import { apiRequest, formatBytes, formatFileType } from "../../lib/api";
import { ALLOWED_FILE_EXTENSIONS, MAX_FILE_SIZE } from "../../lib/constants";

function validateFile(file) {
  if (!file) return "Choose a file to upload.";
  if (file.size > MAX_FILE_SIZE) return "This file is larger than 25 MB. Please choose a smaller file.";

  const extension = `.${file.name.split(".").pop().toLowerCase()}`;
  if (!ALLOWED_FILE_EXTENSIONS.includes(extension)) {
    return "This file type is not supported. Choose a PDF, DOCX, TXT, or XLSX file.";
  }

  return "";
}

export default function VersionUpload({ documentId, demoUserId, onUploaded }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const chooseFile = (event) => {
    const selectedFile = event.target.files?.[0] || null;
    setMessage("");
    setError(validateFile(selectedFile));
    setFile(selectedFile && !validateFile(selectedFile) ? selectedFile : null);
  };

  const removeFile = () => {
    setFile(null);
    setError("");
    setFileInputKey((key) => key + 1);
  };

  const close = () => {
    if (uploading) return;
    setOpen(false);
    setFile(null);
    setError("");
    setMessage("");
    setFileInputKey((key) => key + 1);
  };

  const upload = async (event) => {
    event.preventDefault();
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setUploading(true);
    setError("");
    setMessage("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await apiRequest(`/documents/${documentId}/versions`, {
        method: "POST",
        demoUserId,
        body: formData,
      });
      const payload = await response.json();
      setMessage(`Version ${payload.version.version} uploaded successfully.`);
      setFile(null);
      setFileInputKey((key) => key + 1);
      onUploaded();
    } catch (uploadError) {
      setError(uploadError.message || "Unable to upload this version.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="version-upload">
      <button className="secondary-button version-upload-trigger" type="button" onClick={() => setOpen((value) => !value)}>
        {open ? "Hide upload form" : "Upload new version"}
      </button>
      {open && (
        <form className="version-upload-form" onSubmit={upload}>
          <label className="file-dropzone version-file-dropzone" htmlFor="version-file">
            <span className="upload-cloud">&#8593;</span>
            <strong>{file ? "Replace selected file" : "Choose a replacement file"}</strong>
            <small>PDF, DOCX, TXT or XLSX &middot; Maximum 25 MB</small>
            <input key={fileInputKey} id="version-file" type="file" accept={ALLOWED_FILE_EXTENSIONS.join(",")} onChange={chooseFile} />
          </label>
          {file && (
            <div className="selected-file" aria-live="polite">
              <span className="selected-file-badge">{formatFileType(file.name)}</span>
              <span className="selected-file-info"><strong title={file.name}>{file.name}</strong><small>{file.type || `${formatFileType(file.name)} file`} &middot; {formatBytes(file.size)}</small></span>
              <button className="file-remove" type="button" onClick={removeFile}>Remove</button>
            </div>
          )}
          {error && <p className="form-error" role="alert">{error}</p>}
          {message && <p className="form-success" role="status">{message}</p>}
          <div className="version-upload-actions">
            <button className="primary-button version-confirm-button" type="submit" disabled={uploading}>{uploading ? "Uploading version..." : "Confirm upload"}</button>
            <button className="text-button" type="button" onClick={close} disabled={uploading}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}
