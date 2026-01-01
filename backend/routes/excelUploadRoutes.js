const express = require("express");
const multer = require("multer");
const path = require("path");

const { uploadExcel } = require("../controllers/excelUploadController");

const router = express.Router();

// Storage config
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

router.post("/upload", upload.single("file"), uploadExcel);

module.exports = router;
