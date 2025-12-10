require("dotenv").config();
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();
app.use(express.json());
app.use(helmet());

// ==========================
// Security: Rate Limiting
// ==========================
app.use(
  "/api/",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// ==========================
// In-memory stores (demo)
// ==========================
let users = [];
let items = [];
let userIdCounter = 1;
let itemIdCounter = 1;

// ==========================
// Utility: Send clean errors
// ==========================
const sendError = (res, code, message) =>
  res.status(code).json({ success: false, error: message });

// ==========================
// Auth Middleware (JWT)
// ==========================
function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return sendError(res, 401, "Unauthorized");

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return sendError(res, 401, "Invalid or expired token");
  }
}

// ==========================
// Validators
// ==========================
function validateRegister(body) {
  if (!body.username || !body.password)
    return "Username and password are required";

  if (typeof body.username !== "string" || body.username.length < 3)
    return "Username must be at least 3 characters";

  if (body.password.length < 6)
    return "Password must be at least 6 characters";

  return null;
}

function validateLogin(body) {
  if (!body.username || !body.password)
    return "Username and password are required";
  return null;
}

// ==========================
// AUTH ENDPOINTS
// ==========================

// Register
app.post("/api/register", async (req, res) => {
  const error = validateRegister(req.body);
  if (error) return sendError(res, 400, error);

  const { username, password, email } = req.body;

  if (users.some((u) => u.username === username)) {
    return sendError(res, 400, "Username already exists");
  }

  const hashed = await bcrypt.hash(password, 10);

  const user = {
    id: userIdCounter++,
    username,
    password: hashed,
    email: email || null,
    createdAt: new Date(),
  };

  users.push(user);

  res.status(201).json({
    success: true,
    message: "User registered",
    user: { id: user.id, username: user.username, email: user.email },
  });
});

// Login
app.post("/api/login", async (req, res) => {
  const error = validateLogin(req.body);
  if (error) return sendError(res, 400, error);

  const { username, password } = req.body;

  const user = users.find((u) => u.username === username);
  if (!user) return sendError(res, 401, "Invalid credentials");

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return sendError(res, 401, "Invalid credentials");

  const token = jwt.sign(
    { id: user.id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  res.json({
    success: true,
    message: "Login successful",
    token,
  });
});

// ==========================
// CRUD ENDPOINTS (Protected)
// ==========================

// Create item
app.post("/api/items", auth, (req, res) => {
  const { name, description, price } = req.body;

  if (!name) return sendError(res, 400, "Item name is required");

  const item = {
    id: itemIdCounter++,
    name,
    description: description || "",
    price: price || 0,
    createdAt: new Date(),
    ownerId: req.user.id,
  };

  items.push(item);

  res.status(201).json({ success: true, item });
});

// Get all items
app.get("/api/items", auth, (req, res) => {
  res.json({ success: true, items });
});

// Get item by ID
app.get("/api/items/:id", auth, (req, res) => {
  const item = items.find((i) => i.id === Number(req.params.id));
  if (!item) return sendError(res, 404, "Item not found");

  res.json({ success: true, item });
});

// Update item
app.put("/api/items/:id", auth, (req, res) => {
  const item = items.find((i) => i.id === Number(req.params.id));
  if (!item) return sendError(res, 404, "Item not found");

  item.name = req.body.name || item.name;
  item.description = req.body.description || item.description;
  item.price = req.body.price ?? item.price;
  item.updatedAt = new Date();

  res.json({ success: true, item });
});

// Delete item
app.delete("/api/items/:id", auth, (req, res) => {
  const index = items.findIndex((i) => i.id === Number(req.params.id));
  if (index === -1) return sendError(res, 404, "Item not found");

  items.splice(index, 1);

  res.json({ success: true, message: "Item deleted" });
});

// ==========================
// Global Error Handler
// ==========================
app.use((err, req, res, next) => {
  console.error("SERVER ERROR:", err);
  sendError(res, 500, "Internal server error");
});

// ==========================
// Start Server
// ==========================
const PORT = process.env.PORT || 3000;
if (!process.env.JWT_SECRET) {
  console.warn("⚠️ WARNING: JWT_SECRET not set. Using insecure default.");
}
app.listen(PORT, () =>
  console.log(`Secure API running at http://localhost:${PORT}`)
);
