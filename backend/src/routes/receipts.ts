import { NextFunction, Request, Response, Router } from "express";
import multer from "multer";
import { requireAuth } from "../middleware/auth";
import {
  confirmReceipt,
  deleteReceipt,
  getReceipt,
  getReceiptImage,
  listReceipts,
  scanReceipt,
} from "../controllers/receiptsController";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) callback(null, true);
    else callback(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "file"));
  },
});

// Turns multer errors into clear 400 messages
function uploadReceipt(req: Request, res: Response, next: NextFunction) {
  upload.single("file")(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      const message =
        error.code === "LIMIT_FILE_SIZE" ? "The image is too large (max 8 MB)" : "Please upload a JPG, PNG or WEBP image";
      return res.status(400).json({ error: message });
    }
    if (error) return next(error);
    next();
  });
}

const router = Router();

router.use(requireAuth);

router.get("/", listReceipts);
router.post("/scan", uploadReceipt, scanReceipt);
router.get("/:id", getReceipt);
router.get("/:id/image", getReceiptImage);
router.post("/:id/confirm", confirmReceipt);
router.delete("/:id", deleteReceipt);

export default router;
