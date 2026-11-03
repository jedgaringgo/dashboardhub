# StudentHub – Student Management Dashboard

A CRUD dashboard built with HTML, CSS, vanilla JavaScript, Node.js, Express and SQLite.

## Requirements
- Node.js LTS and npm
- Visual Studio Code

## Run locally
1. Open this folder in VS Code.
2. Open Terminal > New Terminal.
3. Run `npm install`.
4. Run `npm start`.
5. Open http://localhost:3000 in your browser.

The SQLite database (`students.db`) and `students` table are created automatically.

## API routes
- `GET /api/students` – list students
- `GET /api/stats` – dashboard counts
- `POST /api/students` – create a student
- `PUT /api/students/:id` – update a student
- `DELETE /api/students/:id` – delete a student

## Upload to GitHub
Create an empty repository on GitHub. In the VS Code terminal, run:
```bash
git init
git add .
git commit -m "Initial StudentHub CRUD dashboard"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```
Replace the URL with your repository's HTTPS URL.
