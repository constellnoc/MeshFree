import { Router } from "express";
import jwt from "jsonwebtoken";

import { authMiddleware } from "../middleware/auth";

const router = Router();

router.post("/login", (_req, res) => {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    res.status(500).json({
      message: "JWT secret is not configured",
    });
    return;
  }

  const token = jwt.sign({ role: "admin", username: "admin" }, jwtSecret, {
    expiresIn: "1h",
  });

  res.json({
    route: "POST /api/admin/login",
    message: "Admin login endpoint placeholder",
    token,
  });
});

router.use(authMiddleware);

router.get("/submissions", (_req, res) => {
  res.json({
    route: "GET /api/admin/submissions",
    message: "Admin submissions list endpoint placeholder",
  });
});

router.get("/submissions/:id", (req, res) => {
  res.json({
    route: "GET /api/admin/submissions/:id",
    message: "Admin submission detail endpoint placeholder",
    params: {
      id: req.params.id,
    },
  });
});

router.patch("/submissions/:id/approve", (req, res) => {
  res.json({
    route: "PATCH /api/admin/submissions/:id/approve",
    message: "Admin approve submission endpoint placeholder",
    params: {
      id: req.params.id,
    },
  });
});

router.patch("/submissions/:id/reject", (req, res) => {
  res.json({
    route: "PATCH /api/admin/submissions/:id/reject",
    message: "Admin reject submission endpoint placeholder",
    params: {
      id: req.params.id,
    },
  });
});

router.delete("/submissions/:id", (req, res) => {
  res.json({
    route: "DELETE /api/admin/submissions/:id",
    message: "Admin delete submission endpoint placeholder",
    params: {
      id: req.params.id,
    },
  });
});

export default router;
