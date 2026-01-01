const express = require("express");
const cors = require("cors");

const taskRoutes = require("./routes/taskRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/tasks", taskRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "Backend running" });
});

const excelUploadRoutes = require("./routes/excelUploadRoutes");

app.use("/excel", excelUploadRoutes);

app.listen(4000, () => {
  console.log("Server running on http://localhost:4000");
});
