const express = require("express");
const { readTokens, readReports } = require("../db");

const router = express.Router();

// GET /api/tokens
// Public wall – only active inmates, sorted by amount owed, then charges
router.get("/", (req, res) => {
  const tokens = readTokens().filter(t => !t.isRemoved);

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

// GET /api/tokens/:address – detail + rap sheet
router.get("/:address", (req, res) => {
  const address = (req.params.address || "").toLowerCase();
  const tokens = readTokens();
  const token = tokens.find(
    t => (t.address || "").toLowerCase() === address
  );

  if (!token) {
    return res.status(404).json({ error: "Token not found" });
  }

  const reports = readReports().filter(
    r => (r.tokenAddress || "").toLowerCase() === address
  );

  res.json({ token, reports });
});

module.exports = router;
