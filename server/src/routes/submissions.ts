import { Router } from "express";

const router = Router();

router.post("/", (_req, res) => {
  res.json({
    route: "POST /api/submissions",
    message: "Submission create endpoint placeholder",
  });
});

export default router;
