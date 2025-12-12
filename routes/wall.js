const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();

const dataDir = path.join(__dirname, "..", "data");
const wallPath = path.join(dataDir, "wall.json");

function ensureWallFile() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(wallPath)) {
    fs.writeFileSync(wallPath, "[]", "utf8");
  }
}

function readWall() {
  ensureWallFile();
  const raw = fs.readFileSync(wallPath, "utf8");
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch (e) {
    return [];
  }
}

function writeWall(entries) {
  ensureWallFile();
  fs.writeFileSync(wallPath, JSON.stringify(entries, null, 2), "utf8");
}

// GET /api/wall
// Return full wall sorted by count desc
router.get("/", (req, res) => {
  const wall = readWall().slice().sort((a, b) => {
    const ac = a.count || 0;
    const bc = b.count || 0;
    if (bc !== ac) return bc - ac;

    const aTime = a.updatedAt || a.createdAt || 0;
    const bTime = b.updatedAt || b.createdAt || 0;
    return bTime - aTime;
  });

  res.json(wall);
});

// POST /api/wall/event
// Body: { tokenSymbol, type: "arrest" | "sentence" | "bail", txHash }
router.post("/event", (req, res) => {
  const { tokenSymbol, type, txHash } = req.body || {};

  if (!tokenSymbol || !type || !txHash) {
    return res
      .status(400)
      .json({ error: "tokenSymbol, type, and txHash are required" });
  }

  const allowed = ["arrest", "sentence", "bail"];
  if (!allowed.includes(type)) {
    return res
      .status(400)
      .json({ error: "type must be one of: " + allowed.join(", ") });
  }

  const wall = readWall();
  const now = Date.now();
  const sym = String(tokenSymbol).toUpperCase().trim();

  let entry = wall.find(
    (e) => String(e.tokenSymbol || "").toUpperCase() === sym
  );

  if (!entry) {
    entry = {
      tokenSymbol: sym,
      count: 0,
      lastTx: null,
      lastType: null,
      createdAt: now,
      updatedAt: now,
    };
    wall.push(entry);
  }

  entry.count = (entry.count || 0) + 1;
  entry.lastTx = txHash;
  entry.lastType = type;
  entry.updatedAt = now;

  writeWall(wall);

  res.json(entry);
});

module.exports = router;
