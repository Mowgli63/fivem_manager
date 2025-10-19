require("dotenv").config();
const express = require("express");
const session = require("express-session");
const mysql = require("mysql2/promise");
const path = require("path");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: "supersecret", resave: false, saveUninitialized: true }));
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

async function getDB() {
  return await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASS || "password",
    database: process.env.DB_NAME || "fivem_protection",
  });
}

function requireLogin(req, res, next) {
  if (!req.session.loggedIn) return res.redirect("/login");
  next();
}

app.get("/login", (req, res) => res.render("login", { error: null }));

app.post("/login", (req, res) => {
  if (req.body.password === (process.env.ADMIN_PASS || "monmotdepasse")) {
    req.session.loggedIn = true;
    res.redirect("/");
  } else {
    res.render("login", { error: "Mot de passe incorrect" });
  }
});

app.get("/", requireLogin, async (req, res) => {
  const conn = await getDB();
  const [rows] = await conn.execute("SELECT ip, expires_at, created_at FROM whitelist ORDER BY expires_at IS NULL DESC, expires_at ASC");
  await conn.end();

  // Count valid IPs
  const validCount = rows.filter(r => !r.expires_at || new Date(r.expires_at) > new Date()).length;

  res.render("dashboard", { ips: rows, validCount });
});

app.post("/add", requireLogin, async (req, res) => {
  const { ip, days } = req.body;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (parseInt(days) || 30));
  const conn = await getDB();
  await conn.execute(
    "INSERT INTO whitelist (ip, expires_at) VALUES (?, ?) ON DUPLICATE KEY UPDATE expires_at = ?",
    [ip, expiresAt, expiresAt]
  );
  await conn.end();
  res.redirect("/");
});

app.post("/remove", requireLogin, async (req, res) => {
  const { ip } = req.body;
  const conn = await getDB();
  await conn.execute("DELETE FROM whitelist WHERE ip = ?", [ip]);
  await conn.end();
  res.redirect("/");
});

app.post("/clean", requireLogin, async (req, res) => {
  const conn = await getDB();
  await conn.execute("DELETE FROM whitelist WHERE expires_at IS NOT NULL AND expires_at < NOW()");
  await conn.end();
  res.redirect("/");
});

const PORT = parseInt(process.env.PORT || "4000", 10);
app.listen(PORT, () => console.log(`✅ Panel actif sur http://localhost:${PORT}`));
