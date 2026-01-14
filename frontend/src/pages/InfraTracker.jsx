import { API_BASE_URL } from "../config";
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import ExcelReplaceUpload from "../components/ExcelReplaceUpload";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import "./InfraTracker.css";

const PAGE_SIZE = 15;

const formatDate = (date) =>
  date ? new Date(date).toISOString().slice(0, 10) : "";

/* =========================
   🆕 helper for new rows
========================= */
const createEmptyNewRow = () => ({
  _tempId: crypto.randomUUID(),
  infraPhase: "",
  taskName: "",
  status: "Planned",
  percentComplete: 0,
  startDate: "",
  endDate: "",
  owner: "",
});

export default function InfraTracker() {
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [page, setPage] = useState(1);

  const [filters, setFilters] = useState({
    infraPhase: "",
    status: "",
    owner: "",
    taskName: "",
  });

  const [editRowId, setEditRowId] = useState(null);
  const [editData, setEditData] = useState({});
  const [excelMessage, setExcelMessage] = useState("");

  /* =========================
     🆕 NEW ROW STATE (APPENDED)
  ========================= */
  const [newRows, setNewRows] = useState([]);

  // =========================
  // Load Infra Tasks
  // =========================
  const loadTasks = async () => {
    const res = await axios.get("http://localhost:3001/infra-tasks");
    setTasks(res.data || []);
  };

  useEffect(() => {
    loadTasks();
  }, []);

  // =========================
  // Unique owners
  // =========================
  const ownerOptions = useMemo(() => {
    return [...new Set(tasks.map((t) => t.owner).filter(Boolean))].sort();
  }, [tasks]);

  // =========================
  // Apply filters (UNCHANGED)
  // =========================
  useEffect(() => {
    const data = tasks.filter((t) => {
      return (
        (!filters.status || t.status === filters.status) &&
        (!filters.owner || t.owner === filters.owner) &&
        (!filters.infraPhase ||
          t.infraPhase.toLowerCase().includes(filters.infraPhase.toLowerCase())) &&
        (!filters.taskName ||
          t.taskName.toLowerCase().includes(filters.taskName.toLowerCase()))
      );
    });

    setFilteredTasks(data);
    setPage(1);
  }, [filters, tasks]);

  // =========================
  // Pagination
  // =========================
  const totalPages = Math.ceil(filteredTasks.length / PAGE_SIZE);
  const pageData = filteredTasks.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  // =========================
  // Existing Edit handling (UNCHANGED)
  // =========================
  const startEdit = (task) => {
    setEditRowId(task.id);
    setEditData({ ...task });
  };

  const cancelEdit = () => {
    setEditRowId(null);
    setEditData({});
  };

  const handleEditChange = (field, value) => {
    setEditData((prev) => ({ ...prev, [field]: value }));
  };

  const saveEdit = async () => {
    await axios.put(
      `http://localhost:3001/infra-tasks/${editRowId}`,
      editData
    );
    setEditRowId(null);
    setEditData({});
    loadTasks();
  };

  /* =========================
     🆕 NEW ROW HANDLERS
  ========================= */
  const addNewRow = () => {
    setNewRows((prev) => [...prev, createEmptyNewRow()]);
  };

  const updateNewRow = (id, field, value) => {
    setNewRows((prev) =>
      prev.map((r) =>
        r._tempId === id ? { ...r, [field]: value } : r
      )
    );
  };

  const cancelNewRow = (id) => {
    setNewRows((prev) => prev.filter((r) => r._tempId !== id));
  };

  const normalizePayload = (row) => ({
    ...row,
    startDate: row.startDate || null,
    endDate: row.endDate || null,
  });

  const saveNewRow = async (row) => {
    const payload = normalizePayload(row);
    delete payload._tempId;

    await axios.post("http://localhost:3001/infra-tasks", payload);

    setNewRows((prev) => prev.filter((r) => r._tempId !== row._tempId));
    loadTasks();
  };

  const saveAllNewRows = async () => {
    for (const row of newRows) {
      const payload = normalizePayload(row);
      delete payload._tempId;
      await axios.post("http://localhost:3001/infra-tasks", payload);
    }
    setNewRows([]);
    loadTasks();
  };

  // =========================
  // EXPORT TO EXCEL
  // =========================
  const exportToExcel = () => {
    const exportData = tasks.map((t) => ({
      "Infra Phase": t.infraPhase,
      "Task Name": t.taskName,
      Status: t.status,
      "% Complete": t.percentComplete,
      "Start Date": formatDate(t.startDate),
      "End Date": formatDate(t.endDate),
      Owner: t.owner,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Infra Setup");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    const blob = new Blob([excelBuffer], {
      type:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    saveAs(blob, "Infra_Setup_Tracker.xlsx");
  };

  return (
    <div className="tracker-page infra-tracker">
      {/* Header */}
      <div className="tracker-header">
        <h2>Infra Setup Tracker</h2>
        <p className="subtitle">
          Infra phase-wise readiness and execution tracking
        </p>
      </div>

      {/* ACTION BAR (UNCHANGED LAYOUT) */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
        }}
      >
        {/* LEFT SIDE */}
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <ExcelReplaceUpload
            endpoint={"http://localhost:3001/excel/infra-replace"}
            confirmText="This will completely replace ALL Infra Setup data. Continue?"
            onSuccess={() => {
              loadTasks();
              setExcelMessage("Infra Excel uploaded successfully.");
              setTimeout(() => setExcelMessage(""), 4000);
            }}
          />

          <button className="btn-outline btn-xs" onClick={exportToExcel}>
            Download Excel
          </button>

          {/* 🆕 ADD ROW BUTTON */}
          <button className="btn-primary btn-xs" onClick={addNewRow}>
            + Add Row
          </button>

          {newRows.length > 0 && (
            <button className="btn-primary btn-xs" onClick={saveAllNewRows}>
              Save All New Rows
            </button>
          )}
        </div>

        {/* RIGHT SIDE */}
        <button
          className="btn-outline btn-xs"
          onClick={() => navigate("/tracker")}
        >
          ← Back to Program Tracker
        </button>
      </div>

      {excelMessage && (
        <div className="excel-success">{excelMessage}</div>
      )}

      {/* Filters (UNCHANGED) */}
      <div className="filter-bar">
        <input
          placeholder="Infra Phase"
          value={filters.infraPhase}
          onChange={(e) =>
            setFilters({ ...filters, infraPhase: e.target.value })
          }
        />

        <input
          placeholder="Task Name"
          value={filters.taskName}
          onChange={(e) =>
            setFilters({ ...filters, taskName: e.target.value })
          }
        />

        <select
          value={filters.status}
          onChange={(e) =>
            setFilters({ ...filters, status: e.target.value })
          }
        >
          <option value="">All Status</option>
          <option>Planned</option>
          <option>WIP</option>
          <option>Blocked</option>
          <option>Completed</option>
        </select>

        <select
          value={filters.owner}
          onChange={(e) =>
            setFilters({ ...filters, owner: e.target.value })
          }
        >
          <option value="">All Owners</option>
          {ownerOptions.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>

        <button
          className="btn-secondary btn-xs"
          onClick={() =>
            setFilters({
              infraPhase: "",
              status: "",
              owner: "",
              taskName: "",
            })
          }
        >
          Clear
        </button>
      </div>

      {/* TABLE */}
      <div className="table-container">
        <table className="tracker-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Infra Phase</th>
              <th>Task Name</th>
              <th>Status</th>
              <th>% Complete</th>
              <th>Start</th>
              <th>End</th>
              <th>Owner</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {/* 🆕 NEW ROWS */}
            {newRows.map((row) => (
              <tr key={row._tempId} className="editing-row">
                <td>New</td>
                <td><input className="cell-input" value={row.infraPhase} onChange={(e) => updateNewRow(row._tempId, "infraPhase", e.target.value)} /></td>
                <td><input className="cell-input" value={row.taskName} onChange={(e) => updateNewRow(row._tempId, "taskName", e.target.value)} /></td>
                <td>
                  <select className="cell-input" value={row.status} onChange={(e) => updateNewRow(row._tempId, "status", e.target.value)}>
                    <option>Planned</option>
                    <option>WIP</option>
                    <option>Blocked</option>
                    <option>Completed</option>
                  </select>
                </td>
                <td><input type="number" className="cell-input" value={row.percentComplete} onChange={(e) => updateNewRow(row._tempId, "percentComplete", Number(e.target.value))} /></td>
                <td><input type="date" className="cell-input" value={row.startDate} onChange={(e) => updateNewRow(row._tempId, "startDate", e.target.value)} /></td>
                <td><input type="date" className="cell-input" value={row.endDate} onChange={(e) => updateNewRow(row._tempId, "endDate", e.target.value)} /></td>
                <td><input className="cell-input" value={row.owner} onChange={(e) => updateNewRow(row._tempId, "owner", e.target.value)} /></td>
                <td>
                  <button className="btn-primary btn-xs" onClick={() => saveNewRow(row)}>Save</button>
                  <button className="btn-secondary btn-xs" onClick={() => cancelNewRow(row._tempId)}>Cancel</button>
                </td>
              </tr>
            ))}

            {/* EXISTING ROWS */}
            {pageData.map((task, index) => {
              const isEditing = editRowId === task.id;

              return (
                <tr key={task.id} className={isEditing ? "editing-row" : ""}>
                  <td>{(page - 1) * PAGE_SIZE + index + 1}</td>

                  <td>{isEditing ? (
                    <input className="cell-input" value={editData.infraPhase || ""} onChange={(e) => handleEditChange("infraPhase", e.target.value)} />
                  ) : task.infraPhase}</td>

                  <td>{isEditing ? (
                    <input className="cell-input" value={editData.taskName || ""} onChange={(e) => handleEditChange("taskName", e.target.value)} />
                  ) : task.taskName}</td>

                  <td>{isEditing ? (
                    <select className="cell-input" value={editData.status || ""} onChange={(e) => handleEditChange("status", e.target.value)}>
                      <option>Planned</option>
                      <option>WIP</option>
                      <option>Blocked</option>
                      <option>Completed</option>
                    </select>
                  ) : task.status}</td>

                  <td>{isEditing ? (
                    <input type="number" className="cell-input" value={editData.percentComplete ?? ""} onChange={(e) => handleEditChange("percentComplete", Number(e.target.value))} />
                  ) : `${task.percentComplete}%`}</td>

                  <td>{isEditing ? (
                    <input type="date" className="cell-input" value={formatDate(editData.startDate)} onChange={(e) => handleEditChange("startDate", e.target.value)} />
                  ) : formatDate(task.startDate)}</td>

                  <td>{isEditing ? (
                    <input type="date" className="cell-input" value={formatDate(editData.endDate)} onChange={(e) => handleEditChange("endDate", e.target.value)} />
                  ) : formatDate(task.endDate)}</td>

                  <td>{isEditing ? (
                    <input className="cell-input" value={editData.owner || ""} onChange={(e) => handleEditChange("owner", e.target.value)} />
                  ) : task.owner}</td>

                  <td>
                    {isEditing ? (
                      <>
                        <button className="btn-primary btn-xs" onClick={saveEdit}>Save</button>
                        <button className="btn-secondary btn-xs" onClick={cancelEdit}>Cancel</button>
                      </>
                    ) : (
                      <button className="btn-outline btn-xs" onClick={() => startEdit(task)}>Edit</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="pagination-bar">
        <button disabled={page === 1} onClick={() => setPage(page - 1)}>◀</button>
        <span>Page {page} of {totalPages}</span>
        <button disabled={page === totalPages} onClick={() => setPage(page + 1)}>▶</button>
      </div>
    </div>
  );
}
