const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// DB Connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

db.connect((err) => {
  if (err) {
    console.error("Error connecting to the database:", err);
  } else {
    console.log("Connected to MySQL database");
  }
});

// POST: Insert parking record
app.post("/api/park", (req, res) => {
  const { car_number, slot_number, is_resident } = req.body;

  const query = `
    INSERT INTO parking_records (car_number, slot_number, is_resident)
    VALUES (?, ?, ?)`;

  db.query(query, [car_number, slot_number, is_resident], (err, result) => {
    if (err) {
      console.error("Insert error:", err);
      res.status(500).send("Failed to insert parking record.");
    } else {
      res.status(200).json({ message: "Parking record inserted." });
    }
  });
});

// PUT: Update resident/visitor status
app.put("/api/updateResidentStatus", (req, res) => {
  const { car_number, is_resident } = req.body;

  const query = `
    UPDATE parking_records
    SET is_resident = ?
    WHERE car_number = ?
    ORDER BY id DESC LIMIT 1`; // Updates the latest entry for the car

  db.query(query, [is_resident, car_number], (err, result) => {
    if (err) {
      console.error("Update error:", err);
      res.status(500).send("Failed to update status.");
    } else {
      res.status(200).json({ message: "Resident status updated." });
    }
  });
});

// Default test
app.get("/", (req, res) => {
  res.send("API is working");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
