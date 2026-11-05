# College Lab Equipment Management System

A beginner-friendly Full Stack Development (FSD) project based on the supplied database design.

## Technology
- Frontend: HTML, CSS and JavaScript
- Backend: Node.js and Express.js
- Database: MySQL
- Database connection: mysql2

## Main features
1. Dashboard showing equipment, units, available stock, users and active issues.
2. Add, view, search, update and delete equipment.
3. Register students, faculty and administrators.
4. Issue equipment to a registered user.
5. Return equipment and automatically update available quantity.
6. Prevent issuing more units than available.
7. Prevent deleting equipment or users that have active issues.
8. Responsive layout for desktop and mobile.

## Database tables
- `equipment`: equipment_id, name, category, quantity, available_quantity, status
- `users`: user_id, name, email, role
- `issue_records`: issue_id, equipment_id, user_id, issue_date, return_date, quantity, status

## Setup in VS Code
1. Extract the ZIP file.
2. Open the `college-lab-equipment-management` folder in VS Code.
3. Install Node.js and MySQL if not already installed.
4. Open MySQL Workbench and run the complete `schema.sql` file. It creates `lab_equipment_db` and the three tables, with sample rows.
5. Copy `.env.example` and rename the copy to `.env`.
6. Open `.env` and enter your MySQL password:
   - `DB_USER=root`
   - `DB_PASSWORD=your_mysql_password`
   - Keep `DB_NAME=lab_equipment_db`
7. Open the VS Code terminal in this project folder and run:

   ```bash
   npm install
   npm start
   ```

8. Open this address in your browser: http://localhost:3000
9. Use the navigation bar to open the separate Dashboard, Equipment, Users, Issue, and Return pages.

Do not open `public/index.html` directly. Open it through the Node.js server.

## API routes

### Dashboard
- `GET /api/dashboard`

### Equipment
- `GET /api/equipment?q=search`
- `POST /api/equipment`
- `PUT /api/equipment/:id`
- `DELETE /api/equipment/:id`

### Users
- `GET /api/users`
- `POST /api/users`
- `DELETE /api/users/:id`

### Issue and return
- `GET /api/issues`
- `POST /api/issues`
- `POST /api/issues/:id/return`

## Important notes
- The database password is not included in the ZIP. Set it only in your local `.env` file.
- If you already have a database, take a backup before running the sample `schema.sql`.
- This is an academic demonstration project. It includes role labels but does not include login/authentication or production-grade access control.
