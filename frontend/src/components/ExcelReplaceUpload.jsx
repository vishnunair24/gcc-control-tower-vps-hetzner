import { useState } from "react";
import axios from "axios";

export default function ExcelReplaceUpload({ onSuccess }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const upload = async () => {
    if (!file) {
      alert("Please select an Excel file");
      return;
    }

    if (
      !window.confirm(
        "This will completely replace ALL existing tracker data. Continue?"
      )
    )
      return;

    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post(
        "http://localhost:4000/excel/replace",
        formData
      );

      alert(
        `Excel Replace Successful!\n\nDeleted: ${res.data.deleted}\nInserted: ${res.data.inserted}`
      );

      onSuccess();
      setFile(null);
    } catch (err) {
      alert("Excel replace failed. Check backend logs.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="excel-action-bar">
      <label className="file-label">
        Choose Excel
        <input
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
