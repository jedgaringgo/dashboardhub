
const Database = require("better-sqlite3");
const path = require("path");

// =====================================
// CONNECT TO SQLITE DATABASE
// =====================================

const db = new Database(
    path.join(__dirname, "students.db")
);

// =====================================
// DATABASE SETTINGS
// =====================================

// Enable Write-Ahead Logging for better performance
db.pragma("journal_mode = WAL");

// Enable foreign key support
db.pragma("foreign_keys = ON");

// =====================================
// CREATE STUDENTS TABLE
// =====================================

db.exec(`
    CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        course TEXT NOT NULL,
        year_level TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
`);

// =====================================
// DATABASE CONNECTION MESSAGE
// =====================================

console.log("=================================");
console.log("StudentHub Database Connected!");
console.log("Database: SQLite");
console.log("Table: students");
console.log("=================================");

// =====================================
// EXPORT DATABASE
// =====================================

module.exports = db;
