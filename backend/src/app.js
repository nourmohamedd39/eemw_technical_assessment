const pool = require("./config/db");
const documentRoutes = require("./routes/documentRoutes");

const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/documents", documentRoutes);

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "EEMW backend is running"
  });
});

app.get("/api/health/db", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT COUNT(*) AS total_users FROM users"
    );

    res.status(200).json({
      status: "ok",
      database: "connected",
      totalUsers: Number(result.rows[0].total_users),
    });
  } catch (error) {
    console.error("Database connection error:", error.message);

    res.status(500).json({
      status: "error",
      message: "Database connection failed",
    });
  }
});

app.use((error, req, res, next) => {
  console.error("Unhandled application error:", error);

  res.status(error.status || 500).json({
    message: error.status
      ? error.message
      : "An unexpected server error occurred.",
  });
});

module.exports = app;
