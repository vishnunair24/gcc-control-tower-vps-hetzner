import { API_BASE_URL } from "../config";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const DAY = 24 * 60 * 60 * 1000;

const fmt = (d) =>
  new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export default function InfraIntelligence() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);

  // =========================
  // Timeline controls
  // =========================
  const [useCustomStart, setUseCustomStart] = useState(false);
  const [customStart, setCustomStart] = useState("");
  const [weeks, setWeeks] = useState(5);
  const [months, setMonths] = useState(2);
  const [viewMode, setViewMode] = useState("weekly");
  const [showToday, setShowToday] = useState(false);

  // =========================
  // UI state
  // =========================
  const [expanded, setExpanded] = useState({});
  const [filters, setFilters] = useState({
    infraPhase: "",
    taskName: "",
    owner: "",
    status: "",
  });

  // =========================
  // Load Infra Tasks
  // =========================
  useEffect(() => {
    axios
      .get("http://localhost:3001/infra-tasks")
      .then((res) => setTasks(res.data || []));
  }, []);

  const validTasks = useMemo(
    () =>
      tasks.filter(
        (t) => t.infraPhase && t.startDate && t.endDate
      ),
    [tasks]
  );

  const originalStart = useMemo(() => {
    if (!validTasks.length) return null;
    return new Date(
      Math.min(...validTasks.map((t) => new Date(t.startDate)))
    );
  }, [validTasks]);

  const viewStart = useMemo(() => {
    if (useCustomStart && customStart) return new Date(customStart);
    return originalStart;
  }, [useCustomStart, customStart, originalStart]);

  const viewDays =
    viewMode === "monthly" ? months * 30 : weeks * 7;

  const viewEnd =
    viewStart && new Date(viewStart.getTime() + viewDays * DAY);

  const viewDuration =
    viewStart && viewEnd ? viewEnd - viewStart : 0;

  const filteredTasks = useMemo(() => {
    return validTasks.filter((t) =>
      (!filters.infraPhase ||
        t.infraPhase
          .toLowerCase()
          .includes(filters.infraPhase.toLowerCase())) &&
      (!filters.taskName ||
        t.taskName
          .toLowerCase()
          .includes(filters.taskName.toLowerCase())) &&
      (!filters.owner || t.owner === filters.owner) &&
      (!filters.status || t.status === filters.status)
    );
  }, [validTasks, filters]);

  const phases = useMemo(() => {
    const map = {};
    filteredTasks.forEach((t) => {
      if (!map[t.infraPhase]) {
        map[t.infraPhase] = {
          name: t.infraPhase,
          items: [],
          start: new Date(t.startDate),
          end: new Date(t.endDate),
          minProgress: t.percentComplete ?? 0,
        };
      }
      const p = map[t.infraPhase];
      p.items.push(t);
      p.start = new Date(Math.min(p.start, new Date(t.startDate)));
      p.end = new Date(Math.max(p.end, new Date(t.endDate)));
      p.minProgress = Math.min(
        p.minProgress,
        t.percentComplete ?? 0
      );
    });
    return Object.values(map);
  }, [filteredTasks]);

  const barStyle = (start, end) => {
    if (!viewStart || !viewEnd) return null;
    const vs = Math.max(start.getTime(), viewStart.getTime());
    const ve = Math.min(end.getTime(), viewEnd.getTime());
    if (ve <= vs) return null;
    return {
      left: `${((vs - viewStart) / viewDuration) * 100}%`,
      width: `${((ve - vs) / viewDuration) * 100}%`,
    };
  };

  const markers = [];
  if (viewStart) {
    const step = viewMode === "monthly" ? 30 : 7;
    for (let i = 0; i <= viewDays; i += step) {
      markers.push(new Date(viewStart.getTime() + i * DAY));
    }
  }

  const today = new Date();
  const showTodayLine =
    showToday &&
    viewStart &&
    today >= viewStart &&
    today <= viewEnd;

  const ownerOptions = [
    ...new Set(tasks.map((t) => t.owner).filter(Boolean)),
  ];

  /* ============================================================
     🆕 INFRA HEALTH SNAPSHOT (APPENDED – NO EXISTING LOGIC TOUCHED)
     ============================================================ */
  const infraHealth = useMemo(() => {
    const atRiskPhases = new Set();
    let blockedCount = 0;

    filteredTasks.forEach((t) => {
      if (t.status === "Delayed" || t.status === "Blocked") {
        atRiskPhases.add(t.infraPhase);
      }
      if (t.status === "Blocked") blockedCount++;
    });

    const executable = filteredTasks.filter(
      (t) =>
        t.status === "WIP" &&
        (t.percentComplete ?? 0) >= 60 &&
        new Date(t.endDate) >= today
    );

    const executionHealth = filteredTasks.length
      ? Math.round((executable.length / filteredTasks.length) * 100)
      : 0;

    let confidence = "High";
    if (blockedCount > 0 || executionHealth < 50) confidence = "Low";
    else if (executionHealth < 70) confidence = "Medium";

    return {
      executionHealth,
      atRiskCount: atRiskPhases.size,
      blockedCount,
      confidence,
    };
  }, [filteredTasks, today]);

  const applyAtRiskFilter = () => {
    setFilters({
      infraPhase: "",
      taskName: "",
      owner: "",
      status: "Delayed",
    });
  };

  const applyBlockedFilter = () => {
    setFilters({
      infraPhase: "",
      taskName: "",
      owner: "",
      status: "Blocked",
    });
  };

  return (
    <div className="p-6 text-sm">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-semibold">
          Infra Setup Intelligence
        </h2>

        <button
          className="btn-outline btn-xs"
          onClick={() => navigate("/program-intelligence")}
        >
          ← Back to Program Intelligence
        </button>
      </div>

      {/* FILTERS */}
      <div className="flex flex-wrap gap-3 mb-3 text-xs items-center">
        <input
          placeholder="Infra Phase"
          value={filters.infraPhase}
          onChange={(e) =>
            setFilters({ ...filters, infraPhase: e.target.value })
          }
          className="px-2 py-1 border rounded w-40"
        />

        <input
          placeholder="Task Name"
          value={filters.taskName}
          onChange={(e) =>
            setFilters({ ...filters, taskName: e.target.value })
          }
          className="px-2 py-1 border rounded w-44"
        />

        <select
          value={filters.owner}
          onChange={(e) =>
            setFilters({ ...filters, owner: e.target.value })
          }
          className="px-2 py-1 border rounded"
        >
          <option value="">All Owners</option>
          {ownerOptions.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>

        <select
          value={filters.status}
          onChange={(e) =>
            setFilters({ ...filters, status: e.target.value })
          }
          className="px-2 py-1 border rounded"
        >
          <option value="">All Status</option>
          <option>Planned</option>
          <option>WIP</option>
          <option>Blocked</option>
          <option>Completed</option>
        </select>

        <button
          className="btn-secondary btn-xs"
          onClick={() =>
            setFilters({
              infraPhase: "",
              taskName: "",
              owner: "",
              status: "",
            })
          }
        >
          Clear
        </button>
      </div>

      {/* CONTROLS */}
      <div className="flex flex-wrap gap-4 mb-3 text-xs items-center">
        <label>
          <input
            type="checkbox"
            checked={useCustomStart}
            onChange={(e) => setUseCustomStart(e.target.checked)}
          />{" "}
          Custom start
        </label>

        {useCustomStart && (
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
          />
        )}

        {viewMode === "weekly" ? (
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={1}
              value={weeks}
              onChange={(e) =>
                setWeeks(Math.max(1, Math.floor(+e.target.value || 1)))
              }
              className="w-16 px-1 border rounded"
            />
            <span className="text-gray-500">weeks</span>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={1}
              value={months}
              onChange={(e) =>
                setMonths(Math.max(1, Math.floor(+e.target.value || 1)))
              }
              className="w-16 px-1 border rounded"
            />
            <span className="text-gray-500">months</span>
          </div>
        )}

        <label>
          <input
            type="checkbox"
            checked={showToday}
            onChange={(e) => setShowToday(e.target.checked)}
          />{" "}
          Show today
        </label>

        <button
          className="btn-secondary btn-xs"
          onClick={() =>
            setViewMode(viewMode === "weekly" ? "monthly" : "weekly")
          }
        >
          {viewMode === "weekly"
            ? "Monthly View"
            : "Weekly View"}
        </button>
      </div>

      {/* ================= GANTT (UNCHANGED) ================= */}
      {viewStart && (
        <div className="relative">
          {showTodayLine && (
            <div
              className="absolute top-0 bottom-0 w-[2px] bg-blue-400 opacity-60 z-30 animate-pulse pointer-events-none"
              style={{
                left: `${((today - viewStart) / viewDuration) * 100}%`,
              }}
            />
          )}

          <div className="relative h-6 mb-2 ml-52 text-[11px] text-gray-500 overflow-hidden">
            {markers.map((m) => {
              const rawLeft =
                ((m - viewStart) / viewDuration) * 100;
              const left = Math.min(Math.max(rawLeft, 0), 96);
              return (
                <span
                  key={m}
                  className="absolute"
                  style={{ left: `${left}%` }}
                >
                  {fmt(m)}
                </span>
              );
            })}
          </div>

          <div className="bg-white rounded shadow p-3 space-y-2 overflow-hidden">
            {phases.map((p) => {
              const pBar = barStyle(p.start, p.end);
              return (
                <div key={p.name}>
                  <div className="flex gap-3 items-center mb-1">
                    <button
                      className="w-4"
                      onClick={() =>
                        setExpanded((e) => ({
                          ...e,
                          [p.name]: !e[p.name],
                        }))
                      }
                    >
                      {expanded[p.name] ? "▾" : "▸"}
                    </button>

                    <div className="w-44 truncate font-medium">
                      {p.name}
                    </div>

                    <div className="relative flex-1 h-2.5 bg-gray-100 rounded overflow-hidden">
                      {pBar && (
                        <div
                          className="absolute h-2.5 rounded"
                          style={{
                            ...pBar,
                            background: `linear-gradient(
                              to right,
                              #16a34a 0%,
                              #16a34a ${p.minProgress}%,
                              #dc2626 ${p.minProgress}%,
                              #dc2626 100%
                            )`,
                          }}
                          title={`Start: ${fmt(p.start)}
End: ${fmt(p.end)}
Progress: ${p.minProgress}%`}
                        />
                      )}
                    </div>
                  </div>

                  {expanded[p.name] &&
                    p.items.map((t) => {
                      const dBar = barStyle(
                        new Date(t.startDate),
                        new Date(t.endDate)
                      );
                      if (!dBar) return null;

                      return (
                        <div
                          key={t.id}
                          className="flex gap-3 ml-6 mb-1"
                        >
                          <div className="w-44 truncate text-[11px]">
                            {t.taskName}
                          </div>

                          <div className="relative flex-1 h-1.5 bg-gray-100 rounded overflow-hidden">
                            <div
                              className="absolute h-1.5 rounded"
                              style={{
                                ...dBar,
                                background: `linear-gradient(
                                  to right,
                                  #16a34a 0%,
                                  #16a34a ${t.percentComplete}%,
                                  #dc2626 ${t.percentComplete}%,
                                  #dc2626 100%
                                )`,
                              }}
                              title={`Task: ${t.taskName}
Owner: ${t.owner}
Status: ${t.status}
Start: ${fmt(t.startDate)}
End: ${fmt(t.endDate)}
Progress: ${t.percentComplete}%`}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= INFRA HEALTH SNAPSHOT (APPENDED) ================= */}
      <div className="mt-6 bg-white rounded shadow p-4">
        <h3 className="text-sm font-semibold mb-3">
          Infra Health Snapshot
        </h3>

        <div className="grid grid-cols-4 gap-4 text-xs">
          <div>
            <div className="text-gray-500">Execution Health</div>
            <div className="text-lg font-semibold text-red-600">
              {infraHealth.executionHealth}%
            </div>
          </div>

          <div>
            <div className="text-gray-500">
              At-Risk Infra Phases
            </div>
            <button
              onClick={applyAtRiskFilter}
              className="text-lg font-semibold text-red-600 underline"
            >
              {infraHealth.atRiskCount}
            </button>
          </div>

          <div>
            <div className="text-gray-500">Critical Blockers</div>
            <button
              onClick={applyBlockedFilter}
              className="text-lg font-semibold text-red-700 underline"
            >
              {infraHealth.blockedCount}
            </button>
          </div>

          <div>
            <div className="text-gray-500">Delivery Confidence</div>
            <div className="text-lg font-semibold text-red-600">
              {infraHealth.confidence}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
