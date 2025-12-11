const fs = require("fs");
const path = require("path");

const dataDir = path.join(__dirname, "data");
const tokensPath = path.join(dataDir, "tokens.json");
const reportsPath = path.join(dataDir, "reports.json");

function ensureFiles() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(tokensPath)) fs.writeFileSync(tokensPath, "[]", "utf8");
  if (!fs.existsSync(reportsPath)) fs.writeFileSync(reportsPath, "[]", "utf8");
}

ensureFiles();

function readTokens() {
  const raw = fs.readFileSync(tokensPath, "utf8");
  return JSON.parse(raw);
}

function writeTokens(tokens) {
  fs.writeFileSync(tokensPath, JSON.stringify(tokens, null, 2), "utf8");
}

function readReports() {
  const raw = fs.readFileSync(reportsPath, "utf8");
  return JSON.parse(raw);
}

function writeReports(reports) {
  fs.writeFileSync(reportsPath, JSON.stringify(reports, null, 2), "utf8");
}

module.exports = {
  readTokens,
  writeTokens,
  readReports,
  writeReports
};
