"use client";

import { useState } from "react";
import Link from "next/link";
import { apiRequest, formatBytes, formatFileType } from "../../lib/api";
import { ALLOWED_FILE_EXTENSIONS, departments, MAX_FILE_SIZE } from "../../lib/constants";

export default function UploadForm({ demoUserId, onUploaded }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [isRestricted, setIsRestricted] = useState(false);
  const [allowedDepartments, setAllowedDepartments] = useState([]);
  const [file, setFile] = useState(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState(null);
  const [uploadError, setUploadError] = useState("");
  const [duplicateDocument, setDuplicateDocument] = useState(null);

  const toggleDepartment = (departmentId) => {
    setAllowedDepartments((current) => current.includes(departmentId)
      ? current.filter((id) => id !== departmentId)
      : [...current, departmentId]);
  };

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0] || null;
    setUploadError("");
    setUploadMessage(null);
    setDuplicateDocument(null);

    if (selectedFile && selectedFile.size > MAX_FILE_SIZE) {
      setFile(null);
      setUploadError("This file is larger than 25 MB. Please choose a smaller file.");
      return;
    }

    if (selectedFile) {
      const extension = `.${selectedFile.name.split(".").pop().toLowerCase()}`;
      if (!ALLOWED_FILE_EXTENSIONS.includes(extension)) {
        setFile(null);
        setUploadError("This file type is not supported. Choose a PDF, DOCX, TXT, or XLSX file.");
        return;
      }
    }

    setFile(selectedFile);
  };

  const removeFile = () => {
    setFile(null);
    setUploadError("");
    setFileInputKey((key) => key + 1);
  };

  const uploadDocument = async (event) => {
    event.preventDefault();
    setUploadError("");
    setUploadMessage(null);
    setDuplicateDocument(null);

    if (!title.trim()) {
      setUploadError("A document title is required.");
      return;
    }
    if (!file) {
      setUploadError("Please choose a PDF, DOCX, TXT, or XLSX file.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setUploadError("This file is larger than 25 MB. Please choose a smaller file.");
      return;
    }
    if (isRestricted && allowedDepartments.length === 0) {
      setUploadError("Select at least one department for a restricted document.");
      return;
    }

    const formData = new FormData();
    formData.append("title", title.trim());
    formData.append("description", description.trim());
    formData.append("uploaderId", demoUserId);
    formData.append("isRestricted", String(isRestricted));
    formData.append("tags", tags);
    if (isRestricted) formData.append("departmentIds", allowedDepartments.join(","));
    formData.append("file", file);
    setUploading(true);

    try {
      const response = await apiRequest("/documents", { method: "POST", demoUserId, body: formData });
      const payload = await response.json();
      setUploadMessage(`Document uploaded successfully: ${payload.document.title}`);
      setTitle("");
      setDescription("");
      setTags("");
      setIsRestricted(false);
      setAllowedDepartments([]);
      setFile(null);
      setDuplicateDocument(null);
      setFileInputKey((key) => key + 1);
      onUploaded?.();
    } catch (error) {
      setDuplicateDocument(error.payload?.existingDocument || null);
      setUploadError(error.message || "Unable to upload the document.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="panel upload-panel">
      <div className="panel-heading"><div><p className="eyebrow">Add to repository</p><h2>Upload a document</h2></div><span className="panel-icon">&#8597;</span></div>
      <form onSubmit={uploadDocument}>
        <label className="field-label" htmlFor="document-title">Title</label>
        <input id="document-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. 2026 remote work policy" />
        <label className="field-label" htmlFor="document-description">Description <span>Optional</span></label>
        <textarea id="document-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Add useful context for your colleagues" rows="3" />
        <label className="field-label" htmlFor="document-tags">Tags <span>Comma separated</span></label>
        <input id="document-tags" value={tags} onChange={(event) => setTags(event.target.value)} placeholder="e.g: finance, policy, 2026" />
        <div className="file-picker">
          <label className="file-dropzone" htmlFor="document-file"><span className="upload-cloud">&#8593;</span><strong>{file ? "Replace selected file" : "Choose a document"}</strong><small>PDF, DOCX, TXT or XLSX &middot; Maximum 25 MB</small><input key={fileInputKey} id="document-file" type="file" accept={ALLOWED_FILE_EXTENSIONS.join(",")} onChange={handleFileChange} /></label>
          {file && <div className="selected-file" aria-live="polite"><span className="selected-file-badge">{formatFileType(file.name)}</span><span className="selected-file-info"><strong title={file.name}>{file.name}</strong><small>{file.type || `${formatFileType(file.name)} file`} &middot; {formatBytes(file.size)}</small></span><button className="file-remove" type="button" onClick={removeFile}>Remove</button></div>}
        </div>
        <label className="switch-row"><input type="checkbox" checked={isRestricted} onChange={(event) => setIsRestricted(event.target.checked)} /><span className="switch-control" /><span><strong>Restrict by department</strong><small>Only selected departments can view this document.</small></span></label>
        {isRestricted && <fieldset className="department-list"><legend>Allowed departments</legend>{departments.map((department) => <label key={department.id} className="check-row"><input type="checkbox" checked={allowedDepartments.includes(department.id)} onChange={() => toggleDepartment(department.id)} /><span>{department.name}</span></label>)}</fieldset>}
        {uploadError && <p className="alert error" role="alert">{uploadError}{duplicateDocument && <><br /><Link className="duplicate-link" href={`/documents/${duplicateDocument.id}`}>Open the existing document</Link></>}</p>}
        {uploadMessage && <p className="alert success" role="status">{uploadMessage}</p>}
        <button className="primary-button" type="submit" disabled={uploading}>{uploading ? "Uploading..." : "Upload document"}</button>
      </form>
    </div>
  );
}
