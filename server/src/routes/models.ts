import { Router } from "express";

const router = Router();

router.get("/", (_req, res) => {
  res.json({
    route: "GET /api/models",
    message: "Models list endpoint placeholder",
  });
});

router.get("/:id", (req, res) => {
  res.json({
    route: "GET /api/models/:id",
    message: "Model detail endpoint placeholder",
    params: {
      id: req.params.id,
    },
  });
});

router.get("/:id/download", (req, res) => {
  res.json({
    route: "GET /api/models/:id/download",
    message: "Model download endpoint placeholder",
    params: {
      id: req.params.id,
    },
  });
});

export default router;
