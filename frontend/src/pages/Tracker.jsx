import { API_BASE_URL } from "../config";
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import ExcelReplaceUpload from "../components/ExcelReplaceUpload";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import "./Tracker.css";

const PAGE_SIZE = 15;

const formatDate = (date) =>
  date
    ? new Date(date).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "";

/* =========================
   helper for new rows
========================= */
const createEmptyNewRow = () => ({
  _tempId: crypto.randomUUID(),
  workstream: "",
  deliverable: "",
  status: "WIP",
  progress: 0,
  phase: "",
  milestone: "Ready to Source",
  startDate: "",
  endDate: "",
  owner: "",
});

export default function Tracker() {
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [page, setPage] = useState(1);

  const [filters, setFilters] = useState({
    status: "",
    milestone: "",
    workstream: "",
    deliverable: "",
    owner: "",
  });

  const [editRowId, setEditRowId] = useState(null);
  const [editData, setEditData] = useState({});
  const [excelMessage, setExcelMessage] = useState("");
  const [newRows, setNewRows] = useState([]);

  // =========================
  // Load data
  // =========================
  const loadTasks = async () => {
    const res = await axios.get("http://localhost:3001/tasks");
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
  // Apply filters
  // =========================
  useEffect(() => {
    const data = tasks.filter((t) => {
      return (
        (!filters.status || t.status === filters.status) &&
        (!filters.milestone || t.milestone === filters.milestone) &&
        (!filters.owner || t.owner === filters.owner) &&
        (!filters.workstream ||
          t.workstream
            .toLowerCase()
            .includes(filters.workstream.toLowerCase())) &&
        (!filters.deliverable ||
          t.deliverable
            .toLowerCase()
            .includes(filters.deliverable.toLowerCase()))
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
  // Existing edit logic
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
      `http://localhost:3001/tasks/${editRowId}`,
      editData
    );
    setEditRowId(null);
    setEditData({});
    loadTasks();
  };

  // =========================
  // New row logic
  // =========================
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

    await axios.post("http://localhost:3001/tasks", payload);
    setNewRows((prev) => prev.filter((r) => r._tempId !== row._tempId));
    loadTasks();
  };

  const saveAllNewRows = async () => {
    for (const row of newRows) {
      const payload = normalizePayload(row);
      delete payload._tempId;
      await axios.post("http://localhost:3001/tasks", payload);
    }
    setNewRows([]);
    loadTasks();
  };

  // =========================
  // Export
  // =========================
  const exportToExcel = () => {
    const exportData = tasks.map((t) => ({
      Workstream: t.workstream,
      Deliverable: t.deliverable,
      Status: t.status,
      Duration: t.duration,
      "Start Date": formatDate(t.startDate),
      "End Date": formatDate(t.endDate),
      "Progress %": t.progress,
      Phase: t.phase,
      Milestone: t.milestone,
      Owner: t.owner,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tracker");

    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([buffer], {
        type:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      "GCC_Program_Tracker.xlsx"
    );
  };

  return (
    <div className="tracker-page">
      <div className="tracker-header">
        <h2>Program Tracker</h2>
        <p className="subtitle">End-to-end delivery tracking across workstreams</p>
      </div>

      {/* ACTION BAR */}
      <div className="action-bar">
        <div className="left-actions">
          <ExcelReplaceUpload
            endpoint={"http://localhost:3001/excel/replace"}
            confirmText="This will completely replace ALL Program Tracker data. Continue?"
            onSuccess={loadTasks}
          />
          <button className="btn-outline btn-xs" onClick={exportToExcel}>
            Download Excel
          </button>
          <button className="btn-primary btn-xs" onClick={addNewRow}>
            + Add Row
          </button>
          {newRows.length > 0 && (
            <button className="btn-primary btn-xs" onClick={saveAllNewRows}>
              Save All New Rows
            </button>
          )}
        </div>

        <button
          className="btn-primary btn-xs"
          onClick={() => navigate("/infra-tracker")}
        >
          Click to view Infra Setup Tracker
        </button>
      </div>

      {/* ✅ FILTER BAR (RESTORED) */}
      <div className="filter-bar">
        <select
          value={filters.status}
          onChange={(e) =>
            setFilters({ ...filters, status: e.target.value })
          }
        >
          <option value="">All Status</option>
          <option>WIP</option>
          <option>Delayed</option>
          <option>Blocked</option>
          <option>Closed</option>
        </select>

        <select
          value={filters.milestone}
          onChange={(e) =>
            setFilters({ ...filters, milestone: e.target.value })
          }
        >
          <option value="">All Milestones</option>
          <option>Ready to Source</option>
          <option>Ready to Onboard</option>
          <option>Ready to Offer</option>
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

        <input
          placeholder="Workstream"
          value={filters.workstream}
          onChange={(e) =>
            setFilters({ ...filters, workstream: e.target.value })
          }
        />

        <input
          placeholder="Deliverable"
          value={filters.deliverable}
          onChange={(e) =>
            setFilters({ ...filters, deliverable: e.target.value })
          }
        />

        <button
          className="btn-secondary btn-xs"
          onClick={() =>
            setFilters({
              status: "",
              milestone: "",
              workstream: "",
              deliverable: "",
              owner: "",
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
              <th>Workstream</th>
              <th>Deliverable</th>
              <th>Status</th>
              <th>Progress %</th>
              <th>Phase</th>
              <th>Milestone</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Owner</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {/* NEW ROWS */}
            {newRows.map((row) => (
              <tr key={row._tempId} className="editing-row">
                <td>New</td>
                <td><input className="cell-input" value={row.workstream} onChange={(e) => updateNewRow(row._tempId, "workstream", e.target.value)} /></td>
                <td><input className="cell-input" value={row.deliverable} onChange={(e) => updateNewRow(row._tempId, "deliverable", e.target.value)} /></td>
                <td>
                  <select className="cell-input" value={row.status} onChange={(e) => updateNewRow(row._tempId, "status", e.target.value)}>
                    <option>WIP</option>
                    <option>Delayed</option>
                    <option>Blocked</option>
                    <option>Closed</option>
                  </select>
                </td>
                <td><input type="number" className="cell-input" value={row.progress} onChange={(e) => updateNewRow(row._tempId, "progress", Number(e.target.value))} /></td>
                <td><input className="cell-input" value={row.phase} onChange={(e) => updateNewRow(row._tempId, "phase", e.target.value)} /></td>
                <td>
                  <select className="cell-input" value={row.milestone} onChange={(e) => updateNewRow(row._tempId, "milestone", e.target.value)}>
                    <option>Ready to Source</option>
                    <option>Ready to Onboard</option>
                    <option>Ready to Offer</option>
                  </select>
                </td>
                <td><input type="date" className="cell-input" value={row.startDate} onChange={(e) => updateNewRow(row._tempId, "startDate", e.target.value)} /></td>
                <td><input type="date" className="cell-input" value={row.endDate} onChange={(e) => updateNewRow(row._tempId, "endDate", e.target.value)} /></td>
                <td>
                  <select className="cell-input" value={row.owner} onChange={(e) => updateNewRow(row._tempId, "owner", e.target.value)}>
                    <option value="">Select</option>
                    {ownerOptions.map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                </td>
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
                  <td>{isEditing ? <input className="cell-input" value={editData.workstream || ""} onChange={(e) => handleEditChange("workstream", e.target.value)} /> : task.workstream}</td>
                  <td>{isEditing ? <input className="cell-input" value={editData.deliverable || ""} onChange={(e) => handleEditChange("deliverable", e.target.value)} /> : task.deliverable}</td>
                  <td>{isEditing ? (
                    <select className="cell-input" value={editData.status || ""} onChange={(e) => handleEditChange("status", e.target.value)}>
                      <option>WIP</option>
                      <option>Delayed</option>
                      <option>Blocked</option>
                      <option>Closed</option>
                    </select>
                  ) : task.status}</td>
                  <td>{isEditing ? <input type="number" className="cell-input" value={editData.progress ?? ""} onChange={(e) => handleEditChange("progress", Number(e.target.value))} /> : task.progress}%</td>
                  <td>{isEditing ? <input className="cell-input" value={editData.phase || ""} onChange={(e) => handleEditChange("phase", e.target.value)} /> : task.phase}</td>
                  <td>{isEditing ? (
                    <select className="cell-input" value={editData.milestone || ""} onChange={(e) => handleEditChange("milestone", e.target.value)}>
                      <option>Ready to Source</option>
                      <option>Ready to Onboard</option>
                      <option>Ready to Offer</option>
                    </select>
                  ) : task.milestone}</td>
                  <td>{isEditing ? <input type="date" className="cell-input" value={editData.startDate?.slice(0, 10) || ""} onChange={(e) => handleEditChange("startDate", e.target.value)} /> : formatDate(task.startDate)}</td>
                  <td>{isEditing ? <input type="date" className="cell-input" value={editData.endDate?.slice(0, 10) || ""} onChange={(e) => handleEditChange("endDate", e.target.value)} /> : formatDate(task.endDate)}</td>
                  <td>{isEditing ? (
                    <select className="cell-input" value={editData.owner || ""} onChange={(e) => handleEditChange("owner", e.target.value)}>
                      {ownerOptions.map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
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
