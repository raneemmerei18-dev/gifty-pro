import { Router } from "express";
import { verifyToken, adminOnly } from "../middleware/auth.js";
import { uploadImage } from "../middleware/upload.js";
import {
  getReadyBoxes,
  getAllReadyBoxes,
  getReadyBox,
  createReadyBox,
  updateReadyBox,
  deleteReadyBox,
} from "../controllers/readyBoxController.js";

const router = Router();

router.get("/",        getReadyBoxes);
router.get("/all",     verifyToken, adminOnly, getAllReadyBoxes);
router.get("/:id",     getReadyBox);

// image upload (admin)
router.post("/upload-image", verifyToken, adminOnly, (req, res) => {
  uploadImage.single("image")(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || "Upload failed" });
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    res.json({ imagePath: "/images/" + req.file.filename });
  });
});

router.post("/",       verifyToken, adminOnly, createReadyBox);
router.put("/:id",     verifyToken, adminOnly, updateReadyBox);
router.delete("/:id",  verifyToken, adminOnly, deleteReadyBox);

export default router;
