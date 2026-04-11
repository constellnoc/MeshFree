import cors from "cors";
import dotenv from "dotenv";
import express from "express";

import adminRoutes from "./routes/admin";
import modelRoutes from "./routes/models";
import submissionRoutes from "./routes/submissions";

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    message: "MeshFree server is running",
  });
});

app.use("/api/models", modelRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/admin", adminRoutes);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
