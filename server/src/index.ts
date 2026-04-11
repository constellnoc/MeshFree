import cors from "cors";
import dotenv from "dotenv";
import express from "express";

dotenv.config();

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    message: "MeshFree server is running",
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
