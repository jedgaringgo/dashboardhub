
const API = "https://studenthub-backend-d5ve.onrender.com/api";

const tableBody = document.getElementById("studentTable");
const modal = document.getElementById("modalBackdrop");
const form = document.getElementById("studentForm");
const formError = document.getElementById("formError");
const searchInput = document.getElementById("searchInput");
const courseFilter = document.getElementById("courseFilter");

let students = [];
let editingId = null;
let toastTimer = null;

// ===============================
// API REQUEST FUNCTION
// ===============================

async function request(url, options = {}) {
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {})
            }
        });

        const text = await response.text();
        let data = {};

        if (text.trim()) {
            try {
                data = JSON.parse(text);
            } catch {
                throw new Error(
                    `Invalid server response. Status: ${response.status}`
                );
            }
        }

        if (!response.ok) {
            throw new Error(
                data.error || `Server error: ${response.status}`
            );
        }

        return data;

    } catch (error) {
        console.error("API Error:", error);
        throw error;
    }
}

// ===============================
// LOAD DASHBOARD
// ===============================

async function loadDashboard() {
    try {
        const [studentData, stats] = await Promise.all([
            request(`${API}/students`),
            request(`${API}/stats`)
        ]);

        students = studentData;

        document.getElementById("totalStudents").textContent =
            stats.total ?? 0;

        document.getElementById("totalCourses").textContent =
            stats.courses ?? 0;

        // FIXED: Display today's registrations
        document.getElementById("addedToday").textContent =
            stats.addedToday ?? stats.latest ?? 0;

        renderStudents();
        updateCourseFilter();

    } catch (error) {
        console.error("Dashboard Error:", error);

        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="empty">
                    ${escapeHtml(error.message)}
                </td>
            </tr>
        `;

        showToast("Unable to load student records.");
    }
}

// ===============================
// PREVENT HTML INJECTION
// ===============================

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    }[char]));
}

// ===============================
// DISPLAY STUDENTS
// ===============================

function renderStudents() {
    const query = searchInput.value.trim().toLowerCase();
    const selectedCourse = courseFilter.value;

    const filtered = students.filter(student => {
        const fullName =
            `${student.first_name} ${student.last_name}`.toLowerCase();

        const matchesQuery = [
            fullName,
            student.email,
            student.course
        ].some(value =>
            String(value ?? "").toLowerCase().includes(query)
        );

        const matchesCourse =
            !selectedCourse || student.course === selectedCourse;

        return matchesQuery && matchesCourse;
    });

    if (filtered.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="empty">
                    ${students.length
                        ? "No matching students found."
                        : "No students yet. Click Add Student to register your first student."
                    }
                </td>
            </tr>
        `;
    } else {
        tableBody.innerHTML = filtered.map(student => `
            <tr>
                <td>
                    <div class="student-cell">
                        <span class="student-avatar">
                            ${escapeHtml(
                                String(student.first_name || "")
                                    .charAt(0).toUpperCase()
                            )}
                        </span>

                        <strong>
                            ${escapeHtml(student.first_name)}
                            ${escapeHtml(student.last_name)}
                        </strong>
                    </div>
                </td>

                <td>${escapeHtml(student.email)}</td>
                <td>${escapeHtml(student.course)}</td>
                <td>${escapeHtml(student.year_level)}</td>

                <td>
                    <button
                        class="action-btn"
                        data-action="edit"
                        data-id="${student.id}">
                        Edit
                    </button>

                    <button
                        class="action-btn delete-btn"
                        data-action="delete"
                        data-id="${student.id}">
                        Delete
                    </button>
                </td>
            </tr>
        `).join("");
    }

    document.getElementById("recordCount").textContent =
        `${filtered.length} of ${students.length} student(s)`;
}

// ===============================
// COURSE FILTER
// ===============================

function updateCourseFilter() {
    const current = courseFilter.value;

    const courses = [
        ...new Set(students.map(student => student.course))
    ].sort();

    courseFilter.innerHTML = `
        <option value="">All courses</option>

        ${courses.map(course => `
            <option value="${escapeHtml(course)}">
                ${escapeHtml(course)}
            </option>
        `).join("")}
    `;

    courseFilter.value = courses.includes(current) ? current : "";
}

// ===============================
// OPEN STUDENT FORM
// ===============================

function openModal(student = null) {
    editingId = student ? student.id : null;

    form.reset();
    formError.textContent = "";

    document.getElementById("modalTitle").textContent =
        student ? "Edit Student" : "Add Student";

    document.getElementById("saveBtn").textContent =
        student ? "Update Student" : "Save Student";

    if (student) {
        form.elements.first_name.value = student.first_name;
        form.elements.last_name.value = student.last_name;
        form.elements.email.value = student.email;
        form.elements.course.value = student.course;
        form.elements.year_level.value = student.year_level;
    }

    modal.hidden = false;
    form.elements.first_name.focus();
}

// ===============================
// CLOSE STUDENT FORM
// ===============================

function closeModal() {
    modal.hidden = true;
    editingId = null;
    formError.textContent = "";
}

// ===============================
// STUDENT FORM EVENTS
// ===============================

document.getElementById("addStudentBtn")
    .addEventListener("click", () => openModal());

document.getElementById("closeModal")
    .addEventListener("click", closeModal);

document.getElementById("cancelBtn")
    .addEventListener("click", closeModal);

modal.addEventListener("click", event => {
    if (event.target === modal) {
        closeModal();
    }
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !modal.hidden) {
        closeModal();
    }
});

// ===============================
// SEARCH AND FILTER EVENTS
// ===============================

searchInput.addEventListener("input", renderStudents);
courseFilter.addEventListener("change", renderStudents);

// ===============================
// CREATE AND UPDATE STUDENT
// ===============================

form.addEventListener("submit", async event => {
    event.preventDefault();

    formError.textContent = "";

    const body = Object.fromEntries(
        new FormData(form).entries()
    );

    const wasEditing = editingId !== null;
    const currentId = editingId;

    const saveButton = document.getElementById("saveBtn");

    saveButton.disabled = true;
    saveButton.textContent = "Saving...";

    try {
        await request(
            wasEditing
                ? `${API}/students/${currentId}`
                : `${API}/students`,
            {
                method: wasEditing ? "PUT" : "POST",
                body: JSON.stringify(body)
            }
        );

        await loadDashboard();
        closeModal();

        showToast(
            wasEditing
                ? "Student updated successfully!"
                : "Student added successfully!"
        );

    } catch (error) {
        formError.textContent = error.message;

    } finally {
        saveButton.disabled = false;

        saveButton.textContent =
            wasEditing ? "Update Student" : "Save Student";
    }
});

// ===============================
// EDIT AND DELETE STUDENT
// ===============================

tableBody.addEventListener("click", async event => {
    const button = event.target.closest("button[data-action]");

    if (!button) return;

    const id = Number(button.dataset.id);
    const student = students.find(item => item.id === id);

    if (!student) return;

    if (button.dataset.action === "edit") {
        openModal(student);
        return;
    }

    if (button.dataset.action === "delete") {
        const confirmed = confirm(
            `Are you sure you want to delete ${student.first_name} ${student.last_name}?`
        );

        if (!confirmed) return;

        button.disabled = true;

        try {
            await request(`${API}/students/${id}`, {
                method: "DELETE"
            });

            await loadDashboard();
            showToast("Student deleted successfully!");

        } catch (error) {
            showToast(error.message);
            button.disabled = false;
        }
    }
});

// ===============================
// NOTIFICATION / TOAST
// ===============================

function showToast(message) {
    const toast = document.getElementById("toast");

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2600);
}

// ===============================
// ADMIN ACCOUNT DROPDOWN
// ===============================

const adminAccountBtn =
    document.getElementById("adminAccountBtn");

const adminDropdown =
    document.getElementById("adminDropdown");

const closeAdminDropdown =
    document.getElementById("closeAdminDropdown");

if (adminAccountBtn && adminDropdown) {

    adminAccountBtn.addEventListener("click", () => {
        const isOpening = adminDropdown.hidden;

        adminDropdown.hidden = !isOpening;

        adminAccountBtn.setAttribute(
            "aria-expanded",
            String(isOpening)
        );
    });

    if (closeAdminDropdown) {
        closeAdminDropdown.addEventListener("click", () => {
            adminDropdown.hidden = true;

            adminAccountBtn.setAttribute(
                "aria-expanded",
                "false"
            );
        });
    }

    document.addEventListener("click", event => {
        if (
            !adminAccountBtn.contains(event.target) &&
            !adminDropdown.contains(event.target)
        ) {
            adminDropdown.hidden = true;

            adminAccountBtn.setAttribute(
                "aria-expanded",
                "false"
            );
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            adminDropdown.hidden = true;

            adminAccountBtn.setAttribute(
                "aria-expanded",
                "false"
            );
        }
    });
}

// ===============================
// START APPLICATION
// ===============================

loadDashboard();
