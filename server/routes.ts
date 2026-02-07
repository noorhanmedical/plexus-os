import { Router } from "express";

const router = Router();

router.get("/api/hello", (_req, res) => {
  res.json({ message: "Plexus OS backend running" });
});

export default router;
