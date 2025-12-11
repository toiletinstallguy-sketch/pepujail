const express = require("express");
const cors = require("cors");
const tokensRouter = require("./routes/tokens");
const reportsRouter = require("./routes/reports");
const bailRouter = require("./routes/bail");
const adminRouter = require("./routes/admin");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ status: "PEPU Jail backend running" });
});

app.use("/api/tokens", tokensRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/bail", bailRouter);
app.use("/api/admin", adminRouter);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log("PEPU Jail backend listening on port " + PORT);
});
