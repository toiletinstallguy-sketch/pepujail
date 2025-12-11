const express = require("express");
const {
  readTokens,
  writeTokens,
  readReports,
  writeReports
} = require("../db");

const router = express.Router();

const TREASURY_WALLET = "0xdb9da116a22a6bc0c6b1cb48eaa4393f166319f5";
const REPORT_FEE = 1000; // PEPU per arrest/raise

// For now, we do NOT verify chain TX. That can be added later.
// We just record txHash and trust the user for MVP.

// POST /api/reports/arrest
router.post("/arrest", (req, res) => {
  const {
    tokenAddress,
    tokenSymbol,   // ⭐ NEW
    reason,
    details,
    txHash,
    reporter
  } = req.body || {};

  if (!tokenAddress || !txHash || !tokenSymbol) {
    return res.status(400).json({
      error: "tokenAddress, tokenSymbol and txHash are required"
    });
  }

  const tokens = readTokens();
  const now = Date.now();
  const addrLower = String(tokenAddress).toLowerCase();
  const symbolUpper = String(tokenSymbol).toUpperCase();

  let token = tokens.find(
    (t) => (t.address || "").toLowerCase() === addrLower
  );

  if (!token) {
    // 🔥 New jailed token (will show up on the Wall)
    token = {
      address: tokenAddress,
      symbol: symbolUpper,   // ⭐ store symbol for the Wall
      sentence: 0,
      arrests: 0,
      isRemoved: false,
      createdAt: now,
      updatedAt: now
    };
    tokens.push(token);
  } else {
    // If token existed but had no symbol, fill it in
    if (!token.symbol && symbolUpper) {
      token.symbol = symbolUpper;
    }
  }

  token.sentence = (token.sentence || 0) + REPORT_FEE;
  token.arrests = (token.arrests || 0) + 1;
  token.updatedAt = now;

  const reports = readReports();
  reports.push({
    id: "r_" + reports.length + "_" + now,
    tokenAddress,
    tokenSymbol: symbolUpper, // ⭐ store symbol on report too
    type: "arrest",
    reason: reason || null,
    details: details || null,
    txHash,
    reporter: reporter || null,
    amount: REPORT_FEE,
    timestamp: now
  });

  writeTokens(tokens);
  writeReports(reports);

  // Client can use this token object to render on the Wall
  res.json({ token });
});

// POST /api/reports/raise
router.post("/raise", (req, res) => {
  const {
    tokenAddress,
    tokenSymbol,  // optional, but we’ll use if provided
    txHash,
    reporter
  } = req.body || {};

  if (!tokenAddress || !txHash) {
    return res.status(400).json({
      error: "tokenAddress and txHash are required"
    });
  }

  const tokens = readTokens();
  const now = Date.now();
  const addrLower = String(tokenAddress).toLowerCase();
  const symbolUpper = tokenSymbol ? String(tokenSymbol).toUpperCase() : null;

  const token = tokens.find(
    (t) => (t.address || "").toLowerCase() === addrLower
  );

  if (!token) {
    return res.status(404).json({ error: "Token not found in PEPU Jail" });
  }

  // If we have a new symbol and token doesn't have one, set it
  if (symbolUpper && !token.symbol) {
    token.symbol = symbolUpper;
  }

  token.sentence = (token.sentence || 0) + REPORT_FEE;
  token.arrests = (token.arrests || 0) + 1;
  token.updatedAt = now;

  const reports = readReports();
  reports.push({
    id: "r_" + reports.length + "_" + now,
    tokenAddress,
    tokenSymbol: token.symbol || symbolUpper || null,
    type: "raise",
    reason: "Sentence Raise",
    details: null,
    txHash,
    reporter: reporter || null,
    amount: REPORT_FEE,
    timestamp: now
  });

  writeTokens(tokens);
  writeReports(reports);

  res.json({ token });
});

module.exports = router;
