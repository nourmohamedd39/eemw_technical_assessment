export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export const demoUsers = [
  { id: 1, name: "Ahmed Ali", department: "HR" },
  { id: 2, name: "Sarah Hassan", department: "Finance" },
  { id: 3, name: "Omar Mohamed", department: "IT" },
  { id: 4, name: "Mona Adel", department: "Legal" },
];

export const departments = [
  { id: 1, name: "HR" },
  { id: 2, name: "Finance" },
  { id: 3, name: "IT" },
  { id: 4, name: "Legal" },
];

export const MAX_FILE_SIZE = 25 * 1024 * 1024;

export const ALLOWED_FILE_EXTENSIONS = [".pdf", ".docx", ".txt", ".xlsx"];
