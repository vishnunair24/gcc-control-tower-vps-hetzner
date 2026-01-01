const xlsx = require("xlsx");
const prisma = require("../prisma/client");

// Convert Excel date number to JS Date
function excelDateToJSDate(excelDate) {
  if (!excelDate) return null;

  // If already a Date (sometimes Excel gives Date)
  if (excelDate instanceof Date) return excelDate;

  // Excel stores date as number of days since 1900
  return new Date((excelDate - 25569) * 86400 * 1000);
}

exports.uploadExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const rows = xlsx.utils.sheet_to_json(sheet);

    if (rows.length === 0) {
      return res.status(400).json({ error: "Excel file is empty" });
    }

    // 🔥 TRANSFORM ROWS (THIS IS THE FIX)
    const formattedRows = rows.map((row) => ({
      workstream: row.workstream,
      deliverable: row.deliverable,
      status: row.status,
      duration: Number(row.duration),
      startDate: excelDateToJSDate(row.startDate),
      endDate: excelDateToJSDate(row.endDate),
      progress: Number(row.progress),
      phase: row.phase,
      milestone: row.milestone,
      owner: row.owner,
    }));

    await prisma.task.createMany({
      data: formattedRows,
      skipDuplicates: true,
    });

    res.json({
      message: "Excel data imported successfully",
      recordsInserted: formattedRows.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
