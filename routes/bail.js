const express = require("express");
const { readTokens, writeTokens, readReports, writeReports } = require("../db");

const router = express.Router();
const MIN_BAIL = 5000; // PEPU

// POST /api/bail
// Body: { tokenAddress, txHash, amount, payer? }
router.post("/", (req, res) => {
  const { tokenAddress, txHash, amount, payer } = req.body || {};
  if (!tokenAddress || !txHash || typeof amount !== "number") {
    return res
      .status(400)
      .json({ error: "tokenAddress, txHash, and numeric amount are required" });
  }

  const tokens = readTokens();
  const now = Date.now();
  const addrLower = String(tokenAddress).toLowerCase();

  const token = tokens.find(t => (t.address || "").toLowerCase() === addrLower);
  if (!token) {
    return res.status(404).json({ error: "Token not found" });
  }
  if (token.isRemoved) {
    return res.status(400).json({ error: "Token already released from PEPU Jail" });
  }

  const required = Math.max(MIN_BAIL, token.sentence || 0);
  if (amount < required) {
    return res.status(400).json({
      error: "Insufficient bail",
      required,
      provided: amount
    });
  }

  token.isRemoved = true;
  token.updatedAt = now;

  const reports = readReports();
  reports.push({
    id: "b_" + reports.length + "_" + now,
    tokenAddress,
    type: "bail",
    reason: "Bail Paid",
    details: null,
    txHash,
    reporter: payer || null,
    amount,
    timestamp: now
  });

  writeTokens(tokens);
  writeReports(reports);

  res.json({ message: "Token released from PEPU Jail", token });
});

module.exports = router;
