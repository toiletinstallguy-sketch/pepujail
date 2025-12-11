const express = require("express");
const { readTokens, writeTokens } = require("../db");

const router = express.Router();

const ADMIN_KEY = process.env.ADMIN_KEY || "change-me-admin-key";

// Admin auth middleware
router.use((req, res, next) => {
  const key = req.header("x-admin-key");
  if (!key || key !== ADMIN_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
});

// GET /api/admin/tokens – see all tokens, sorted
router.get("/tokens", (req, res) => {
  const tokens = readTokens();
  tokens.sort((a, b) => {
    const aSentence = a.sentence || 0;
    const bSentence = b.sentence || 0;
    if (bSentence !== aSentence) return bSentence - aSentence;
    const aArrests = a.arrests || 0;
    const bArrests = b.arrests || 0;
    return bArrests - aArrests;
  });
  res.json(tokens);
});

// POST /api/admin/tokens/:address/hide – remove from public wall
router.post("/tokens/:address/hide", (req, res) => {
  const address = (req.params.address || "").toLowerCase();
  const tokens = readTokens();
  const t = tokens.find(x => (x.address || "").toLowerCase() === address);

  if (!t) return res.status(404).json({ error: "Token not found" });

  t.isRemoved = true;
  t.updatedAt = Date.now();
  writeTokens(tokens);

  res.json({ token: t });
});

// POST /api/admin/tokens/:address/show – restore to public wall
router.post("/tokens/:address/show", (req, res) => {
  const address = (req.params.address || "").toLowerCase();
  const tokens = readTokens();
  const t = tokens.find(x => (x.address || "").toLowerCase() === address);

  if (!t) return res.status(404).json({ error: "Token not found" });

  t.isRemoved = false;
  t.updatedAt = Date.now();
  writeTokens(tokens);

  res.json({ token: t });
});

module.exports = router;
