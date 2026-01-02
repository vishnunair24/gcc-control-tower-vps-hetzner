const express = require("express");
const multer = require("multer");
const {
  replaceFromExcel,
} = require("../controllers/excelUploadController");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/replace", upload.single("file"), replaceFromExcel);

module.exports = router;
