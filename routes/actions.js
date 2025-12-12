const express = require("express");
const { readTokens, writeTokens, readReports, writeReports } = require("../db");

const router = express.Router();

// === CONFIG ===
// Treasury wallet (recipient)
const TREASURY_WALLET = (process.env.TREASURY_WALLET || "0xf4550eEB513e46C6bf834118Ee101660A6baD9ec").toLowerCase();

// Fees (what user is *supposed* to pay to treasury)
const FEES = {
  arrest: 1000,
  raise: 1000,
  bail: 5000,
};

// In this skeleton we support two flows:
// 1) Pay & Submit: client sends txHash and we record it.
// 2) Submit Unpaid (TEST / DEMO): no txHash; record as unpaid.
// NOTE: If you want strict enforcement, set REQUIRE_TX=true.
const REQUIRE_TX = String(process.env.REQUIRE_TX || "").toLowerCase() === "true";

function normalizeAddr(a) {
  return String(a || "").trim().toLowerCase();
}

function requireBasics(req, res, next) {
  const { tokenAddress, tokenSymbol, reporterName, actionType } = req.body || {};
  if (!actionType || !FEES[actionType]) return res.status(400).json({ error: "actionType is required: arrest|raise|bail" });
  if (!tokenAddress) return res.status(400).json({ error: "tokenAddress is required" });
  if (!tokenSymbol) return res.status(400).json({ error: "tokenSymbol is required" });
  if (!reporterName) return res.status(400).json({ error: "reporterName is required" });
  next();
}

function upsertToken(tokens, addrLower, patch) {
  const idx = tokens.findIndex(t => normalizeAddr(t.address) === addrLower);
  if (idx === -1) {
    const token = {
      address: addrLower,
      symbol: patch.symbol || "",
      owed: 0,
      strikes: 0,
      unpaidCount: 0,
      lastActionAt: Date.now(),
      lastReporterName: patch.lastReporterName || "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...patch,
    };
    tokens.unshift(token);
    return token;
  }
  tokens[idx] = { ...tokens[idx], ...patch, updatedAt: Date.now() };
  return tokens[idx];
}

function recordReport(reports, report) {
  reports.unshift({
    id: "r_" + Date.now() + "_" + Math.floor(Math.random() * 1e6),
    createdAt: Date.now(),
    ...report,
  });
  // keep file small
  if (reports.length > 5000) reports.length = 5000;
}

// POST /api/actions
// Body:
//  actionType: "arrest"|"raise"|"bail"
//  tokenAddress, tokenSymbol
//  reporterName
//  reason?, details?
//  txHash? (optional unless REQUIRE_TX=true)
router.post("/", requireBasics, (req, res) => {
  const { actionType, tokenAddress, tokenSymbol, reporterName, reason, details, txHash } = req.body || {};

  const addrLower = normalizeAddr(tokenAddress);
  const hasTx = !!txHash && String(txHash).length > 10;

  if (REQUIRE_TX && !hasTx) {
    return res.status(400).json({ error: "txHash is required (payment required)" });
  }

  const tokens = readTokens();
  const reports = readReports();

  const fee = FEES[actionType];

  // Update the token "sentence" ledger
  let token = upsertToken(tokens, addrLower, {
    symbol: String(tokenSymbol || "").toUpperCase(),
    lastReporterName: reporterName,
    lastActionAt: Date.now(),
  });

  if (actionType === "bail") {
    token.owed = Math.max(0, (token.owed || 0) - fee);
    // optional: reduce strikes on bail (feel free to tweak)
    token.strikes = Math.max(0, (token.strikes || 0) - 1);
  } else {
    token.owed = (token.owed || 0) + fee;
    token.strikes = (token.strikes || 0) + 1;
  }

  // If action is unpaid, increment unpaidCount so the UI can label it.
  if (!hasTx) token.unpaidCount = (token.unpaidCount || 0) + 1;

  // Remove fully paid inmates
  if (token.owed === 0 && actionType === "bail") {
    // keep a record in reports but remove from active roster
    tokens.splice(tokens.findIndex(t => normalizeAddr(t.address) === addrLower), 1);
  }

  // Record the action event
  recordReport(reports, {
    actionType,
    tokenAddress: addrLower,
    tokenSymbol: String(tokenSymbol || "").toUpperCase(),
    reporterName,
    reason: reason || "",
    details: details || "",
    txHash: hasTx ? String(txHash) : "",
    isPaid: hasTx,
    treasuryWallet: TREASURY_WALLET,
    expectedFee: fee,
  });

  writeTokens(tokens);
  writeReports(reports);

  return res.json({
    ok: true,
    actionType,
    expectedFee: fee,
    isPaid: hasTx,
    token,
  });
});

module.exports = router;
