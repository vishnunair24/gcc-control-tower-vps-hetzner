import { API_BASE_URL } from "../config";
import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from "recharts";
import * as XLSX from "xlsx";

const COLORS = ["#2563eb", "#f59e0b", "#ef4444", "#6b7280", "#10b981"];
const today = new Date();

const pct = (v) =>
  v === null || v === undefined
    ? "0%"
    : typeof v === "string" && v.includes("%")
    ? v
    : `${v}%`;

const fmtDate = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt)) return d;
  return `${String(dt.getDate()).padStart(2, "0")}-${String(
    dt.getMonth() + 1
  ).padStart(2, "0")}-${dt.getFullYear()}`;
};

// ✅ helper ONLY for on-track logic
const daysFromToday = (d) => {
  if (!d) return null;
  return Math.ceil(
    (new Date(d).setHours(0,0,0,0) - new Date(today).setHours(0,0,0,0)) /
    (1000 * 60 * 60 * 24)
  );
};

function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [activeSignal, setActiveSignal] = useState(null);

  // ✅ filters ONLY for clicked table
  const [tableFilters, setTableFilters] = useState({
    workstream: "",
    deliverable: "",
    owner: "",
    status: "",
  });

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    const res = await axios.get("http://localhost:3001/tasks");
    setTasks(res.data);
  };

  // ================= KPIs =================
  const totalTasks = tasks.length;
  const delayedTasks = tasks.filter(t => t.status === "Delayed").length;
  const blockedTasks = tasks.filter(t => t.status === "Blocked").length;
  const completedTasks = tasks.filter(t => t.status === "Closed").length;

  const completionRate =
    totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  // ================= CHART DATA =================
  const statusData = [
    { name: "WIP", value: tasks.filter(t => t.status === "WIP").length },
    { name: "Closed", value: completedTasks },
    { name: "Delayed", value: delayedTasks },
    { name: "Blocked", value: blockedTasks },
  ].filter(d => d.value > 0);

  const workstreamData = Object.values(
    tasks.reduce((acc, t) => {
      const p =
        typeof t.progress === "string"
          ? Number(t.progress.replace("%", ""))
          : t.progress || 0;

      acc[t.workstream] = acc[t.workstream] || {
        workstream: t.workstream,
        total: 0,
        count: 0,
      };
      acc[t.workstream].total += p;
      acc[t.workstream].count += 1;
      return acc;
    }, {})
  ).map(w => ({
    workstream: w.workstream,
    avgProgress: Math.round(w.total / w.count),
  }));

  // ================= SIGNAL LOGIC =================
  const signals = useMemo(() => ({
    overdue: {
      label: "Overdue Tasks",
      data: tasks.filter(
        t => t.endDate && new Date(t.endDate) < today && t.status !== "Closed"
      ),
    },
    risk: {
      label: "At Risk",
      data: tasks.filter(
        t => t.status === "Delayed" || t.status === "Blocked"
      ),
    },
    slow: {
      label: "Slow Progress",
      data: tasks.filter(t => {
        const p =
          typeof t.progress === "string"
            ? Number(t.progress.replace("%", ""))
            : t.progress || 0;
        return p < 30 && t.status !== "Closed";
      }),
    },
    // ✅ UPDATED EXACTLY AS REQUESTED
    ontrack: {
      label: "On Track / Proceed",
      data: tasks.filter(t => {
        const p =
          typeof t.progress === "string"
            ? Number(t.progress.replace("%", ""))
            : t.progress || 0;

        const leadDays = daysFromToday(t.endDate);

        return (
          t.status === "Closed" &&
          p > 60 &&
          leadDays !== null ||
          leadDays >= 3 &&
          leadDays <= 30
        );
      }),
    },
  }), [tasks]);

  // ✅ apply filters ONLY to clicked table
  const filteredSignalData = useMemo(() => {
    if (!activeSignal) return [];
    return signals[activeSignal].data.filter(r => (
      (!tableFilters.workstream ||
        r.workstream?.toLowerCase().includes(tableFilters.workstream.toLowerCase())) &&
      (!tableFilters.deliverable ||
        r.deliverable?.toLowerCase().includes(tableFilters.deliverable.toLowerCase())) &&
      (!tableFilters.owner ||
        r.owner?.toLowerCase().includes(tableFilters.owner.toLowerCase())) &&
      (!tableFilters.status || r.status === tableFilters.status)
    ));
  }, [activeSignal, tableFilters, signals]);

  const exportExcel = (rows, name) => {
    const ws = XLSX.utils.json_to_sheet(
      rows.map(r => ({
        Workstream: r.workstream,
        Deliverable: r.deliverable,
        Status: r.status,
        Progress: pct(r.progress),
        StartDate: fmtDate(r.startDate),
        EndDate: fmtDate(r.endDate),
        Owner: r.owner,
        Phase: r.phase,
        Milestone: r.milestone,
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.writeFile(wb, `${name}.xlsx`);
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">Executive Dashboard</h2>

      {/* KPI CARDS */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <KpiCard title="Total Tasks" value={totalTasks} color="bg-blue-600" />
        <KpiCard title="Delayed" value={delayedTasks} color="bg-yellow-500" />
        <KpiCard title="Blocked" value={blockedTasks} color="bg-red-500" />
        <KpiCard
          title="Completion"
          value={`${completionRate}%`}
          color="bg-green-600"
        />
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded shadow p-4">
          <h3 className="font-semibold mb-3">Tasks by Status</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90}>
                {statusData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded shadow p-4">
          <h3 className="font-semibold mb-3">Avg Progress by Workstream (%)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={workstreamData}>
              <XAxis dataKey="workstream" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="avgProgress" fill="#2563eb" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ALWAYS VISIBLE RISK TABLE */}
      <div className="bg-white rounded shadow p-4 mb-6">
        <h3 className="font-semibold mb-4 text-red-600">
          Delayed & Blocked Tasks
        </h3>
        <SignalTable data={signals.risk.data} />
      </div>

      {/* SIGNAL BUTTONS */}
      <div className="flex gap-3 mb-4">
        {Object.entries(signals).map(([key, cfg]) => {
          const active = activeSignal === key;
          return (
            <button
              key={key}
              className={`px-4 py-2 rounded-md text-sm font-medium border transition
                ${
                  active
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
                }`}
              onClick={() => {
                setActiveSignal(active ? null : key);
                setTableFilters({
                  workstream: "",
                  deliverable: "",
                  owner: "",
                  status: "",
                });
              }}
            >
              {cfg.label} ({cfg.data.length})
            </button>
          );
        })}
      </div>

      {/* CLICKABLE TABLE */}
      {activeSignal && (
        <div className="bg-white rounded shadow p-4">
          <div className="flex justify-between mb-3">
            <h3 className="font-semibold">
              {signals[activeSignal].label}
            </h3>
            <div className="flex gap-2">
              <button
                className="btn-outline btn-xs"
                onClick={() =>
                  exportExcel(
                    filteredSignalData,
                    signals[activeSignal].label.replace(/ /g, "_")
                  )
                }
              >
                Export Excel
              </button>
              <button
                className="btn-secondary btn-xs"
                onClick={() => setActiveSignal(null)}
              >
                Clear
              </button>
            </div>
          </div>

          {/* ✅ FILTERS FOR CLICKED TABLE ONLY */}
          <div className="flex gap-2 mb-3">
            <input className="border px-2 py-1 text-xs" placeholder="Workstream"
              value={tableFilters.workstream}
              onChange={e => setTableFilters({ ...tableFilters, workstream: e.target.value })} />
            <input className="border px-2 py-1 text-xs" placeholder="Deliverable"
              value={tableFilters.deliverable}
              onChange={e => setTableFilters({ ...tableFilters, deliverable: e.target.value })} />
            <input className="border px-2 py-1 text-xs" placeholder="Owner"
              value={tableFilters.owner}
              onChange={e => setTableFilters({ ...tableFilters, owner: e.target.value })} />
            <select className="border px-2 py-1 text-xs"
              value={tableFilters.status}
              onChange={e => setTableFilters({ ...tableFilters, status: e.target.value })}>
              <option value="">All Status</option>
              <option>WIP</option>
              <option>Delayed</option>
              <option>Blocked</option>
              <option>Closed</option>
            </select>
          </div>

          <SignalTable data={filteredSignalData} />
        </div>
      )}
    </div>
  );
}

// ================= TABLE =================
function SignalTable({ data }) {
  return data.length === 0 ? (
    <p className="text-gray-500 text-sm">No items</p>
  ) : (
    <table className="min-w-full text-[12.5px] leading-tight">
      <thead className="bg-gray-100">
        <tr className="text-gray-700 uppercase text-[11px] tracking-wide">
          <th className="px-2 py-1.5 text-left">Workstream</th>
          <th className="px-2 py-1.5 text-left">Deliverable</th>
          <th className="px-2 py-1.5 text-left">Status</th>
          <th className="px-2 py-1.5 text-left">Progress</th>
          <th className="px-2 py-1.5 text-left">Start Date</th>
          <th className="px-2 py-1.5 text-left">End Date</th>
          <th className="px-2 py-1.5 text-left">Owner</th>
        </tr>
      </thead>
      <tbody>
        {data.map((r) => (
          <tr key={r.id} className="border-t hover:bg-gray-50">
            <td className="px-2 py-1.5">{r.workstream}</td>
            <td className="px-2 py-1.5">{r.deliverable}</td>
            <td className={`px-2 py-1.5 font-medium ${
              r.status === "Delayed" || r.status === "Blocked"
                ? "text-red-600"
                : "text-gray-800"
            }`}>
              {r.status}
            </td>
            <td className="px-2 py-1.5">{pct(r.progress)}</td>
            <td className="px-2 py-1.5">{fmtDate(r.startDate)}</td>
            <td className="px-2 py-1.5">{fmtDate(r.endDate)}</td>
            <td className="px-2 py-1.5">{r.owner}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ================= KPI CARD =================
function KpiCard({ title, value, color }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`${color} text-white rounded-lg p-6 shadow`}
    >
      <div className="text-sm opacity-80">{title}</div>
      <div className="text-3xl font-bold">{value}</div>
    </motion.div>
  );
}

export default Dashboard;
