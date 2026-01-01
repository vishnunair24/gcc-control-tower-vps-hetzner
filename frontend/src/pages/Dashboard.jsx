import { useEffect, useState } from "react";
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

const COLORS = ["#2563eb", "#f59e0b", "#ef4444", "#6b7280", "#10b981"];

function Dashboard() {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    const res = await axios.get("http://localhost:4000/tasks");
    setTasks(res.data);
  };

  // ---------- KPIs ----------
  const totalTasks = tasks.length;
  const delayedTasks = tasks.filter(t => t.status === "Delayed").length;
  const blockedTasks = tasks.filter(t => t.status === "Blocked").length;
  const completedTasks = tasks.filter(t => t.status === "Closed").length;

  const completionRate =
    totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  // ---------- CHART DATA ----------
  const statusData = [
    { name: "WIP", value: tasks.filter(t => t.status === "WIP").length },
    { name: "Closed", value: completedTasks },
    { name: "Delayed", value: delayedTasks },
    { name: "Blocked", value: blockedTasks },
    { name: "On Hold", value: tasks.filter(t => t.status === "On Hold").length },
  ].filter(d => d.value > 0);

  const workstreamData = Object.values(
    tasks.reduce((acc, task) => {
      acc[task.workstream] = acc[task.workstream] || {
        workstream: task.workstream,
        count: 0,
      };
      acc[task.workstream].count += 1;
      return acc;
    }, {})
  );

  // ---------- RISK ITEMS ----------
  const riskItems = tasks.filter(
    t => t.status === "Delayed" || t.status === "Blocked"
  );

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
              <Pie
                data={statusData}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                outerRadius={90}
              >
                {statusData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded shadow p-4">
          <h3 className="font-semibold mb-3">Tasks by Workstream</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={workstreamData}>
              <XAxis dataKey="workstream" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#2563eb" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* RISK & ATTENTION */}
      <div className="bg-white rounded shadow p-4">
        <h3 className="font-semibold mb-4">Risk & Attention Items</h3>

        {riskItems.length === 0 ? (
          <p className="text-gray-500">No critical risks at the moment</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">Workstream</th>
                <th className="p-2 text-left">Deliverable</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left">Owner</th>
              </tr>
            </thead>
            <tbody>
              {riskItems.map(item => (
                <tr key={item.id} className="border-t">
                  <td className="p-2">{item.workstream}</td>
                  <td className="p-2">{item.deliverable}</td>
                  <td className="p-2 font-semibold text-red-600">
                    {item.status}
                  </td>
                  <td className="p-2">{item.owner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ---------- KPI CARD COMPONENT ----------
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
