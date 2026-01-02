import { useEffect, useState, useMemo } from "react";
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

export default function Tracker() {
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

  // =========================
  // Load data
  // =========================
  const loadTasks = async () => {
    const res = await axios.get("http://localhost:4000/tasks");
    setTasks(res.data);
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
  // Edit handling
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
      `http://localhost:4000/tasks/${editRowId}`,
      editData
    );
    setEditRowId(null);
    setEditData({});
    loadTasks();
  };

  // =========================
  // EXPORT TO EXCEL (NEW)
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

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Tracker");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    const blob = new Blob([excelBuffer], {
      type:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    saveAs(blob, "GCC_Program_Tracker.xlsx");
  };

  return (
    <div className="tracker-page">
      {/* Header */}
      <div className="tracker-header">
        <h2>Program Tracker</h2>
        <p className="subtitle">
          End-to-end delivery tracking across workstreams
        </p>
      </div>

      {/* Excel Actions */}
      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
        <ExcelReplaceUpload
          onSuccess={() => {
            loadTasks();
            setExcelMessage(
              "Excel uploaded. Tracker data replaced successfully."
            );
            setTimeout(() => setExcelMessage(""), 4000);
          }}
        />

        <button
          className="btn-outline btn-xs"
          onClick={exportToExcel}
        >
          Download Excel
        </button>
      </div>

      {excelMessage && (
        <div className="excel-success">{excelMessage}</div>
      )}

      {/* Filters */}
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

      {/* Table */}
      <div className="table-container">
        <table className="tracker-table">
          <colgroup>
            <col style={{ width: "40px" }} />
            <col style={{ width: "80px" }} />
            <col style={{ width: "210px" }} />
            <col style={{ width: "70px" }} />
            <col style={{ width: "70px" }} />
            <col style={{ width: "60px" }} />
            <col style={{ width: "110px" }} />
            <col style={{ width: "100px" }} />
            <col style={{ width: "100px" }} />
            <col style={{ width: "100px" }} />
            <col style={{ width: "100px" }} />
          </colgroup>

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
            {pageData.map((task, index) => {
              const isEditing = editRowId === task.id;

              return (
                <tr key={task.id} className={isEditing ? "editing-row" : ""}>
                  <td>{(page - 1) * PAGE_SIZE + index + 1}</td>

                  <td>{isEditing ? (
                    <input className="cell-input"
                      value={editData.workstream || ""}
                      onChange={(e) =>
                        handleEditChange("workstream", e.target.value)
                      } />
                  ) : task.workstream}</td>

                  <td>{isEditing ? (
                    <input className="cell-input"
                      value={editData.deliverable || ""}
                      onChange={(e) =>
                        handleEditChange("deliverable", e.target.value)
                      } />
                  ) : task.deliverable}</td>

                  <td>{isEditing ? (
                    <select className="cell-input"
                      value={editData.status || ""}
                      onChange={(e) =>
                        handleEditChange("status", e.target.value)
                      }>
                      <option>WIP</option>
                      <option>Delayed</option>
                      <option>Blocked</option>
                      <option>Closed</option>
                    </select>
                  ) : task.status}</td>

                  <td>{isEditing ? (
                    <input type="number" className="cell-input"
                      value={editData.progress ?? ""}
                      onChange={(e) =>
                        handleEditChange("progress", Number(e.target.value))
                      } />
                  ) : task.progress}%</td>

                  <td>{isEditing ? (
                    <input className="cell-input"
                      value={editData.phase || ""}
                      onChange={(e) =>
                        handleEditChange("phase", e.target.value)
                      } />
                  ) : task.phase}</td>

                  <td>{isEditing ? (
                    <select className="cell-input"
                      value={editData.milestone || ""}
                      onChange={(e) =>
                        handleEditChange("milestone", e.target.value)
                      }>
                      <option>Ready to Source</option>
                      <option>Ready to Onboard</option>
                      <option>Ready to Offer</option>
                    </select>
                  ) : task.milestone}</td>

                  <td>{isEditing ? (
                    <input type="date" className="cell-input"
                      value={editData.startDate?.slice(0, 10) || ""}
                      onChange={(e) =>
                        handleEditChange("startDate", e.target.value)
                      } />
                  ) : formatDate(task.startDate)}</td>

                  <td>{isEditing ? (
                    <input type="date" className="cell-input"
                      value={editData.endDate?.slice(0, 10) || ""}
                      onChange={(e) =>
                        handleEditChange("endDate", e.target.value)
                      } />
                  ) : formatDate(task.endDate)}</td>

                  <td>{isEditing ? (
                    <select className="cell-input"
                      value={editData.owner || ""}
                      onChange={(e) =>
                        handleEditChange("owner", e.target.value)
                      }>
                      {ownerOptions.map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  ) : task.owner}</td>

                  <td>
                    {isEditing ? (
                      <>
                        <button className="btn-primary btn-xs" onClick={saveEdit}>
                          Save
                        </button>
                        <button className="btn-secondary btn-xs" onClick={cancelEdit}>
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button className="btn-outline btn-xs" onClick={() => startEdit(task)}>
                        Edit
                      </button>
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
