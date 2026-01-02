const XLSX = require("xlsx");
const prisma = require("../prisma/client");

/**
 * Normalize header names
 */
function normalizeHeader(h) {
  return String(h)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Convert Excel date safely
 */
function parseDate(value, fallback) {
  if (typeof value === "number") {
    const utcDays = Math.floor(value - 25569);
    return new Date(utcDays * 86400 * 1000);
  }

  if (typeof value === "string" && value.trim() !== "") {
    const d = new Date(value);
    if (!isNaN(d)) return d;
  }

  return fallback;
}

exports.replaceFromExcel = async (req, res) => {
  console.log("🔥 EXCEL REPLACE CONTROLLER ACTIVE (HEADER SAFE)");

  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    // Read raw rows (no header guessing)
    const rows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
    });

    if (rows.length < 2) {
      return res.status(400).json({ error: "Excel has no data rows" });
    }

    // Normalize headers
    const headerRow = rows[0].map(normalizeHeader);

    const colIndex = (name) =>
      headerRow.findIndex((h) => h.includes(name));

    const idx = {
      workstream: colIndex("workstream"),
      deliverable: colIndex("deliverable"),
      status: colIndex("status"),
      duration: colIndex("duration"),
      startDate: colIndex("start"),
      endDate: colIndex("end"),
      progress: colIndex("progress"),
      phase: colIndex("phase"),
      milestone: colIndex("milestone"),
      owner: colIndex("owner"),
    };

    const tasks = [];
    const warnings = [];
    const today = new Date();

    rows.slice(1).forEach((row, i) => {
      // Skip fully empty rows
      if (row.every((c) => String(c).trim() === "")) return;

      const startDate = parseDate(
        row[idx.startDate],
        today
      );

      const endDate = parseDate(
        row[idx.endDate],
        startDate
      );

      tasks.push({
        workstream:
          row[idx.workstream]?.toString().trim() || "General",
        deliverable:
          row[idx.deliverable]?.toString().trim() || "TBD",
        status:
          row[idx.status]?.toString().trim() || "WIP",
        duration:
          Number(row[idx.duration]) || 0,
        startDate,
        endDate,
        progress:
          Number(row[idx.progress]) || 0,
        phase:
          row[idx.phase]?.toString().trim() || "Unknown",
        milestone:
          row[idx.milestone]?.toString().trim() || "",
        owner:
          row[idx.owner]?.toString().trim() || "",
      });
    });

    if (!tasks.length) {
      return res.status(400).json({
        error:
          "No valid data rows found. Check Excel headers and data.",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const deleted = await tx.task.deleteMany();
      const inserted = await tx.task.createMany({
        data: tasks,
      });

      return {
        deleted: deleted.count,
        inserted: inserted.count,
      };
    });

    res.json({
      message: "Excel replaced successfully",
      ...result,
      rowsRead: rows.length - 1,
    });
  } catch (err) {
    console.error("❌ EXCEL REPLACE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};
