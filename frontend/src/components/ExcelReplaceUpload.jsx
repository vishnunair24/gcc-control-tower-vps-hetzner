import { API_BASE_URL } from "../config";
import { useState, useRef } from "react";
import axios from "axios";

export default function ExcelReplaceUpload({
  endpoint = "http://localhost:3001/excel/replace",
  confirmText = "This will completely replace ALL existing data. Continue?",
  onSuccess,
}) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  // 🔑 CRITICAL FIX
  const fileInputRef = useRef(null);

  const upload = async () => {
    if (!file) {
      alert("Please select an Excel file");
      return;
    }

    if (!window.confirm(confirmText)) return;

    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post(endpoint, formData);

      alert(
        `Excel Replace Successful!\n\nDeleted: ${res.data.deleted}\nInserted: ${res.data.inserted}`
      );

      onSuccess?.();
    } catch (err) {
      console.error("Excel upload failed:", err);
      alert("Excel replace failed. Check backend logs.");
    } finally {
      setLoading(false);

      // ✅ RESET FILE INPUT SO SAME FILE CAN BE UPLOADED AGAIN
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="excel-action-bar">
      <label className="file-label">
        Choose Excel
        <input
          ref={fileInputRef}
          type="file"
          hidden
          onChange={(e) => setFile(e.target.files[0])}
        />
      </label>

      <span className="file-name">
        {file ? file.name : "No file selected"}
      </span>

      <button
        className="btn-danger btn-xs"
        onClick={upload}
        disabled={loading}
      >
        {loading ? "Replacing..." : "Replace Data"}
      </button>
    </div>
  );
}
