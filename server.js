const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const express = require("express");
const mysql = require("mysql2");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "lab_equipment_db",
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

db.getConnection((err, connection) => {
  if (err) {
    console.error("MySQL connection failed:", err.message);
    console.error("Check the values in .env and make sure MySQL is running.");
    process.exit(1);
  }
  console.log("Connected to MySQL database:", process.env.DB_NAME || "lab_equipment_db");
  connection.release();
});

const run = (sql, values = []) => new Promise((resolve, reject) => {
  db.query(sql, values, (err, result) => err ? reject(err) : resolve(result));
});
const validText = value => typeof value === "string" && value.trim().length > 0;
const validWhole = value => Number.isInteger(Number(value)) && Number(value) >= 0;
const fail = (res, err) => {
  console.error(err);
  res.status(500).json({ message: "Server error. Check the backend terminal." });
};

app.get("/api/dashboard", async (req, res) => {
  try {
    const [equipment] = await run("SELECT COUNT(*) total, COALESCE(SUM(quantity),0) units, COALESCE(SUM(available_quantity),0) available FROM equipment");
    const [users] = await run("SELECT COUNT(*) total FROM users");
    const [issued] = await run("SELECT COUNT(*) total, COALESCE(SUM(quantity),0) units FROM issue_records WHERE status='Issued'");
    res.json({ equipment: equipment.total, units: equipment.units, available: equipment.available, users: users.total, activeIssues: issued.total, issuedUnits: issued.units });
  } catch (err) { fail(res, err); }
});

app.get("/api/equipment", async (req, res) => {
  try {
    const q = `%${String(req.query.q || "").trim()}%`;
    const rows = await run(`SELECT * FROM equipment
      WHERE name LIKE ? OR category LIKE ? OR CAST(equipment_id AS CHAR) LIKE ?
      ORDER BY equipment_id DESC`, [q, q, q]);
    res.json(rows);
  } catch (err) { fail(res, err); }
});

app.post("/api/equipment", async (req, res) => {
  const { name, category, quantity } = req.body;
  if (!validText(name) || !validText(category) || !validWhole(quantity))
    return res.status(400).json({ message: "Enter a name, category and valid quantity." });
  try {
    const result = await run("INSERT INTO equipment (name, category, quantity, available_quantity, status) VALUES (?, ?, ?, ?, ?)",
      [name.trim(), category.trim(), Number(quantity), Number(quantity), Number(quantity) ? "Available" : "Unavailable"]);
    res.status(201).json({ message: "Equipment added successfully.", equipment_id: result.insertId });
  } catch (err) { fail(res, err); }
});

app.put("/api/equipment/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { name, category, quantity } = req.body;
  if (!Number.isInteger(id) || id < 1 || !validText(name) || !validText(category) || !validWhole(quantity))
    return res.status(400).json({ message: "Enter valid equipment details." });
  try {
    const [old] = await run("SELECT * FROM equipment WHERE equipment_id=?", [id]);
    if (!old) return res.status(404).json({ message: "Equipment not found." });
    const issued = old.quantity - old.available_quantity;
    if (Number(quantity) < issued) return res.status(400).json({ message: `Quantity cannot be less than ${issued} currently issued unit(s).` });
    const available = Number(quantity) - issued;
    await run("UPDATE equipment SET name=?, category=?, quantity=?, available_quantity=?, status=? WHERE equipment_id=?",
      [name.trim(), category.trim(), Number(quantity), available, available ? "Available" : "Unavailable", id]);
    res.json({ message: "Equipment updated successfully." });
  } catch (err) { fail(res, err); }
});

app.delete("/api/equipment/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ message: "Invalid equipment ID." });
  try {
    const [item] = await run("SELECT * FROM equipment WHERE equipment_id=?", [id]);
    if (!item) return res.status(404).json({ message: "Equipment not found." });
    const [active] = await run("SELECT COUNT(*) total FROM issue_records WHERE equipment_id=?", [id]);
    if (active.total) return res.status(400).json({ message: "Cannot delete equipment because it has issue history." });
    await run("DELETE FROM equipment WHERE equipment_id=?", [id]);
    res.json({ message: "Equipment deleted successfully." });
  } catch (err) { fail(res, err); }
});

app.get("/api/users", async (req, res) => {
  try {
    const q = `%${String(req.query.q || "").trim()}%`;
    res.json(await run("SELECT * FROM users WHERE name LIKE ? OR email LIKE ? OR role LIKE ? ORDER BY user_id DESC", [q, q, q]));
  } catch (err) { fail(res, err); }
});

app.post("/api/users", async (req, res) => {
  const { name, email, role } = req.body;
  if (!validText(name) || !validText(email) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !validText(role))
    return res.status(400).json({ message: "Enter a valid name, email and role." });
  try {
    const result = await run("INSERT INTO users (name,email,role) VALUES (?,?,?)", [name.trim(), email.trim(), role.trim()]);
    res.status(201).json({ message: "User added successfully.", user_id: result.insertId });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") return res.status(400).json({ message: "This email is already registered." });
    fail(res, err);
  }
});

app.delete("/api/users/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ message: "Invalid user ID." });
  try {
    const [active] = await run("SELECT COUNT(*) total FROM issue_records WHERE user_id=?", [id]);
    if (active.total) return res.status(400).json({ message: "Cannot delete a user because the user has issue history." });
    const result = await run("DELETE FROM users WHERE user_id=?", [id]);
    if (!result.affectedRows) return res.status(404).json({ message: "User not found." });
    res.json({ message: "User deleted successfully." });
  } catch (err) { fail(res, err); }
});

app.get("/api/issues", async (req, res) => {
  try {
    res.json(await run(`SELECT i.*, e.name equipment_name, u.name user_name, u.role
      FROM issue_records i JOIN equipment e ON i.equipment_id=e.equipment_id
      JOIN users u ON i.user_id=u.user_id ORDER BY i.issue_id DESC`));
  } catch (err) { fail(res, err); }
});

app.post("/api/issues", async (req, res) => {
  const equipmentId = Number(req.body.equipment_id);
  const userId = Number(req.body.user_id);
  const quantity = Number(req.body.quantity);
  if (!Number.isInteger(equipmentId) || equipmentId < 1 || !Number.isInteger(userId) || userId < 1 || !Number.isInteger(quantity) || quantity < 1)
    return res.status(400).json({ message: "Select equipment, user and a quantity of at least 1." });
  const connection = await new Promise((resolve, reject) => db.getConnection((e, c) => e ? reject(e) : resolve(c))).catch(err => null);
  if (!connection) return res.status(500).json({ message: "Could not connect to database." });
  const query = (sql, values=[]) => new Promise((resolve, reject) => connection.query(sql, values, (e, r) => e ? reject(e) : resolve(r)));
  try {
    await new Promise((resolve, reject) => connection.beginTransaction(e => e ? reject(e) : resolve()));
    const [item] = await query("SELECT * FROM equipment WHERE equipment_id=? FOR UPDATE", [equipmentId]);
    const [user] = await query("SELECT * FROM users WHERE user_id=?", [userId]);
    if (!item) throw Object.assign(new Error("Equipment not found."), { status: 400 });
    if (!user) throw Object.assign(new Error("User not found."), { status: 400 });
    if (item.available_quantity < quantity) throw Object.assign(new Error("Not enough equipment is available."), { status: 400 });
    const issueDate = req.body.issue_date || new Date().toISOString().slice(0,10);
    await query("INSERT INTO issue_records (equipment_id,user_id,issue_date,quantity,status) VALUES (?,?,?,?,'Issued')", [equipmentId,userId,issueDate,quantity]);
    const available = item.available_quantity - quantity;
    await query("UPDATE equipment SET available_quantity=?, status=? WHERE equipment_id=?", [available, available ? "Available" : "Unavailable", equipmentId]);
    await new Promise((resolve, reject) => connection.commit(e => e ? reject(e) : resolve()));
    res.status(201).json({ message: "Equipment issued successfully." });
  } catch (err) {
    await new Promise(resolve => connection.rollback(() => resolve()));
    res.status(err.status || 500).json({ message: err.status ? err.message : "Could not issue equipment." });
  } finally { connection.release(); }
});

app.post("/api/issues/:id/return", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ message: "Invalid issue ID." });
  const connection = await new Promise((resolve, reject) => db.getConnection((e,c) => e ? reject(e) : resolve(c))).catch(() => null);
  if (!connection) return res.status(500).json({ message: "Could not connect to database." });
  const query = (sql, values=[]) => new Promise((resolve,reject) => connection.query(sql,values,(e,r) => e ? reject(e) : resolve(r)));
  try {
    await new Promise((resolve,reject) => connection.beginTransaction(e => e ? reject(e) : resolve()));
    const [issue] = await query("SELECT * FROM issue_records WHERE issue_id=? FOR UPDATE", [id]);
    if (!issue) throw Object.assign(new Error("Issue record not found."), { status: 404 });
    if (issue.status === "Returned") throw Object.assign(new Error("This equipment is already returned."), { status: 400 });
    const [item] = await query("SELECT * FROM equipment WHERE equipment_id=? FOR UPDATE", [issue.equipment_id]);
    const available = item.available_quantity + issue.quantity;
    await query("UPDATE equipment SET available_quantity=?, status='Available' WHERE equipment_id=?", [available, item.equipment_id]);
    await query("UPDATE issue_records SET status='Returned', return_date=CURDATE() WHERE issue_id=?", [id]);
    await new Promise((resolve,reject) => connection.commit(e => e ? reject(e) : resolve()));
    res.json({ message: "Equipment returned successfully." });
  } catch (err) {
    await new Promise(resolve => connection.rollback(() => resolve()));
    res.status(err.status || 500).json({ message: err.status ? err.message : "Could not return equipment." });
  } finally { connection.release(); }
});

app.listen(PORT, () => console.log(`College Lab Equipment Management running at http://localhost:${PORT}`));
