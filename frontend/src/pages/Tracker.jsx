import { useEffect, useState } from "react";
import axios from "axios";

function Tracker() {
  const [tasks, setTasks] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ status: "", progress: 0 });

  const [filters, setFilters] = useState({
    search: "",
    workstream: "",
    owner: "",
    status: "",
    milestone: "",
  });

  // Fetch ALL tasks (single source of truth)
  const fetchTasks = async () => {
    const res = await axios.get("http://localhost:4000/tasks");
    setTasks(res.data);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // Dropdown values MUST come from full dataset
  const workstreams = [...new Set(tasks.map(t => t.workstream))];
  const owners = [...new Set(tasks.map(t => t.owner))];

  // Start edit
  const startEdit = (task) => {
    setEditingId(task.id);
    setEditData({
      status: task.status,
      progress: Number(task.progress),
    });
  };

  // Save edit
  const saveEdit = async (id) => {
    await axios.put(`http://localhost:4000/tasks/${id}`, {
      status: editData.status,
      progress: Number(editData.progress),
    });
    setEditingId(null);
    fetchTasks();
  };

  // Clear ALL filters (true reset)
  const clearFilters = () => {
    setFilters({
      search: "",
      workstream: "",
      owner: "",
      status: "",
      milestone: "",
    });
  };

  /**
   * ✅ INDEPENDENT FILTER LOGIC
   * Each condition:
   * - Applies ONLY if that filter has a value
   * - Does NOT depend on any other filter
   */
  const filteredTasks = tasks.filter((task) => {
    if (
      filters.search &&
      !task.deliverable.toLowerCase().includes(filters.search.toLowerCase())
    ) {
      return false;
    }

    if (filters.workstream && task.workstream !== filters.workstream) {
      return false;
    }

    if (filters.owner && task.owner !== filters.owner) {
      return false;
    }

    if (filters.status && task.status !== filters.status) {
      return false;
    }

    if (filters.milestone && task.milestone !== filters.milestone) {
      return false;
    }

    return true; // passes all active filters
  });

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Task Tracker</h2>

      {/* FILTERS */}
      <div className="bg-white p-4 rounded shadow mb-4">
        <div className="grid grid-cols-6 gap-4 items-end">

          {/* Deliverable Search */}
          <input
            className="border p-2 rounded"
            placeholder="Search Deliverable"
            value={filters.search}
            onChange={(e) =>
              setFilters({ ...filters, search: e.target.value })
            }
          />

          {/* Workstream */}
          <select
            className="border p-2 rounded"
            value={filters.workstream}
            onChange={(e) =>
              setFilters({ ...filters, workstream: e.target.value })
            }
          >
            <option value="">All Workstreams</option>
            {workstreams.map(ws => (
              <option key={ws}>{ws}</option>
            ))}
          </select>

          {/* Owner */}
          <select
            className="border p-2 rounded"
            value={filters.owner}
            onChange={(e) =>
              setFilters({ ...filters, owner: e.target.value })
            }
          >
            <option value="">All Owners</option>
            {owners.map(o => (
              <option key={o}>{o}</option>
            ))}
          </select>

          {/* Status */}
          <select
            className="border p-2 rounded"
            value={filters.status}
            onChange={(e) =>
              setFilters({ ...filters, status: e.target.value })
            }
          >
            <option value="">All Status</option>
            <option>WIP</option>
            <option>Closed</option>
            <option>Delayed</option>
            <option>Blocked</option>
            <option>On Hold</option>
          </select>

          {/* Milestone */}
          <select
            className="border p-2 rounded"
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

          <button
            onClick={clearFilters}
            className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded shadow overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Workstream</th>
              <th className="p-3 text-left">Deliverable</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Progress</th>
              <th className="p-3 text-left">Phase</th>
              <th className="p-3 text-left">Milestone</th>
              <th className="p-3 text-left">Start Date</th>
              <th className="p-3 text-left">End Date</th>
              <th className="p-3 text-left">Owner</th>
              <th className="p-3 text-left">Action</th>
            </tr>
          </thead>

          <tbody>
            {filteredTasks.map(task => (
              <tr
                key={task.id}
                className={`border-t ${
                  task.status === "Delayed" || task.status === "Blocked"
                    ? "bg-red-50"
                    : ""
                }`}
              >
                <td className="p-3">{task.workstream}</td>
                <td className="p-3">{task.deliverable}</td>

                <td className="p-3">
                  {editingId === task.id ? (
                    <select
                      value={editData.status}
                      onChange={(e) =>
                        setEditData({ ...editData, status: e.target.value })
                      }
                    >
                      <option>WIP</option>
                      <option>Closed</option>
                      <option>Delayed</option>
                      <option>Blocked</option>
                      <option>On Hold</option>
                    </select>
                  ) : (
                    task.status
                  )}
                </td>

                <td className="p-3">
                  {editingId === task.id ? (
                    <input
                      type="number"
                      className="border w-16"
                      value={editData.progress}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          progress: Number(e.target.value),
                        })
                      }
                    />
                  ) : (
                    `${task.progress}%`
                  )}
                </td>

                <td className="p-3">{task.phase}</td>
                <td className="p-3">{task.milestone}</td>
                <td className="p-3">
                  {new Date(task.startDate).toLocaleDateString()}
                </td>
                <td className="p-3">
                  {new Date(task.endDate).toLocaleDateString()}
                </td>
                <td className="p-3">{task.owner}</td>

                <td className="p-3">
                  {editingId === task.id ? (
                    <button
                      className="text-green-600"
                      onClick={() => saveEdit(task.id)}
                    >
                      Save
                    </button>
                  ) : (
                    <button
                      className="text-blue-600"
                      onClick={() => startEdit(task)}
                    >
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Tracker;
