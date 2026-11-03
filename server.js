
require("dotenv").config();

const express = require("express");
const path = require("path");
const cors = require("cors");
const db = require("./database");

const app = express();
const PORT = process.env.PORT || 3000;

// =====================================
// MIDDLEWARE
// =====================================

app.use(cors({
    origin: [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5500",
        "http://127.0.0.1:5500"
    ]
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Serve frontend files
app.use(express.static(path.join(__dirname, "public")));

// =====================================
// VALIDATE STUDENT DATA
// =====================================

function validateStudent(body) {
    const {
        first_name,
        last_name,
        email,
        course,
        year_level
    } = body || {};

    const fields = [
        first_name,
        last_name,
        email,
        course,
        year_level
    ];

    if (!fields.every(value =>
        typeof value === "string" && value.trim().length > 0
    )) {
        return "Please complete all fields.";
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email.trim())) {
        return "Please enter a valid email address.";
    }

    return null;
}

// =====================================
// GET ALL STUDENTS (READ)
// =====================================

app.get("/api/students", (req, res) => {
    try {
        const students = db.prepare(`
            SELECT *
            FROM students
            ORDER BY id DESC
        `).all();

        return res.status(200).json(students);

    } catch (error) {
        console.error("READ ERROR:", error);

        return res.status(500).json({
            error: "Failed to retrieve students."
        });
    }
});

// =====================================
// GET DASHBOARD STATISTICS
// =====================================

app.get("/api/stats", (req, res) => {
    try {
        // Total registered students
        const total = db.prepare(`
            SELECT COUNT(*) AS count
            FROM students
        `).get().count;

        // Number of different courses
        const courses = db.prepare(`
            SELECT COUNT(DISTINCT course) AS count
            FROM students
        `).get().count;

        // Students registered today (Philippine time)
        const addedToday = db.prepare(`
            SELECT COUNT(*) AS count
            FROM students
            WHERE date(created_at, '+8 hours') = date('now', '+8 hours')
        `).get().count;

        return res.status(200).json({
            total,
            courses,
            latest: addedToday,
            addedToday
        });

    } catch (error) {
        console.error("STATS ERROR:", error);

        return res.status(500).json({
            error: "Failed to load dashboard statistics."
        });
    }
});

// =====================================
// ADD STUDENT (CREATE)
// =====================================

app.post("/api/students", (req, res) => {
    try {
        const validationError = validateStudent(req.body);

        if (validationError) {
            return res.status(400).json({
                error: validationError
            });
        }

        const result = db.prepare(`
            INSERT INTO students (
                first_name,
                last_name,
                email,
                course,
                year_level
            )
            VALUES (
                @first_name,
                @last_name,
                @email,
                @course,
                @year_level
            )
        `).run({
            first_name: req.body.first_name.trim(),
            last_name: req.body.last_name.trim(),
            email: req.body.email.trim().toLowerCase(),
            course: req.body.course.trim(),
            year_level: req.body.year_level.trim()
        });

        const student = db.prepare(`
            SELECT *
            FROM students
            WHERE id = ?
        `).get(result.lastInsertRowid);

        console.log("STUDENT CREATED:", student.id);

        return res.status(201).json({
            success: true,
            message: "Student added successfully!",
            student
        });

    } catch (error) {
        console.error("CREATE ERROR:", error);

        if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
            return res.status(409).json({
                error: "This email address is already registered."
            });
        }

        return res.status(500).json({
            error: "Unable to add student."
        });
    }
});

// =====================================
// UPDATE STUDENT (UPDATE)
// =====================================

app.put("/api/students/:id", (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id < 1) {
            return res.status(400).json({
                error: "Invalid student ID."
            });
        }

        const validationError = validateStudent(req.body);

        if (validationError) {
            return res.status(400).json({
                error: validationError
            });
        }

        const result = db.prepare(`
            UPDATE students
            SET
                first_name = @first_name,
                last_name = @last_name,
                email = @email,
                course = @course,
                year_level = @year_level
            WHERE id = @id
        `).run({
            id,
            first_name: req.body.first_name.trim(),
            last_name: req.body.last_name.trim(),
            email: req.body.email.trim().toLowerCase(),
            course: req.body.course.trim(),
            year_level: req.body.year_level.trim()
        });

        if (result.changes === 0) {
            return res.status(404).json({
                error: "Student not found."
            });
        }

        const student = db.prepare(`
            SELECT *
            FROM students
            WHERE id = ?
        `).get(id);

        console.log("STUDENT UPDATED:", id);

        return res.status(200).json({
            success: true,
            message: "Student updated successfully!",
            student
        });

    } catch (error) {
        console.error("UPDATE ERROR:", error);

        if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
            return res.status(409).json({
                error: "This email address is already registered."
            });
        }

        return res.status(500).json({
            error: "Unable to update student."
        });
    }
});

// =====================================
// DELETE STUDENT (DELETE)
// =====================================

app.delete("/api/students/:id", (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id < 1) {
            return res.status(400).json({
                error: "Invalid student ID."
            });
        }

        const result = db.prepare(`
            DELETE FROM students
            WHERE id = ?
        `).run(id);

        if (result.changes === 0) {
            return res.status(404).json({
                error: "Student not found."
            });
        }

        console.log("STUDENT DELETED:", id);

        return res.status(200).json({
            success: true,
            message: "Student deleted successfully!"
        });

    } catch (error) {
        console.error("DELETE ERROR:", error);

        return res.status(500).json({
            error: "Unable to delete student."
        });
    }
});

// =====================================
// UNKNOWN API ROUTES
// =====================================

app.use("/api", (req, res) => {
    return res.status(404).json({
        error: "API endpoint not found."
    });
});

// =====================================
// ERROR HANDLER
// =====================================

app.use((error, req, res, next) => {
    console.error("SERVER ERROR:", error);

    if (res.headersSent) {
        return next(error);
    }

    return res.status(error.status || 500).json({
        error: error.status === 400
            ? "Invalid JSON request."
            : "Internal server error."
    });
});

// =====================================
// START SERVER
// =====================================

app.listen(PORT, () => {
    console.log("--------------------------------");
    console.log("StudentHub Server Started!");
    console.log(`Server: http://localhost:${PORT}`);
    console.log("Database: SQLite");
    console.log("CRUD API: Ready");
    console.log("--------------------------------");
});
