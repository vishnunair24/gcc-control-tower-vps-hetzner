import { API_BASE_URL } from "../config";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const DAY = 24 * 60 * 60 * 1000;

const fmt = (d) =>
  new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const fmtMonth = (d) =>
  new Date(d).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
  });

export default function ProgramIntelligence() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);

  // ================= TIMELINE CONTROLS =================
  const [useCustomStart, setUseCustomStart] = useState(false);
  const [customStart, setCustomStart] = useState("");
  const [weeks, setWeeks] = useState(5);
  const [months, setMonths] = useState(3);
  const [viewMode, setViewMode] = useState("weekly");
  const [showToday, setShowToday] = useState(false);

  // ================= UI STATE =================
  const [expanded, setExpanded] = useState({});
  const [filters, setFilters] = useState({
    workstream: "",
    deliverable: "",
    owner: "",
    status: "",
  });

  // ================= LOAD DATA =================
  useEffect(() => {
    axios.get("http://localhost:3001/tasks").then((res) => {
      setTasks(res.data || []);
    });
  }, []);

  // ================= DATA PREP =================
  const validTasks = useMemo(
    () =>
      tasks.filter(
        (t) => t.workstream && t.startDate && t.endDate
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

  // ================= FILTERING =================
  const filteredTasks = useMemo(() => {
    return validTasks.filter((t) =>
      (!filters.workstream ||
        t.workstream.toLowerCase().includes(filters.workstream.toLowerCase())) &&
      (!filters.deliverable ||
        t.deliverable?.toLowerCase().includes(filters.deliverable.toLowerCase())) &&
      (!filters.owner || t.owner === filters.owner) &&
      (!filters.status || t.status === filters.status)
    );
  }, [validTasks, filters]);

  // ================= WORKSTREAM GROUPING =================
  const workstreams = useMemo(() => {
    const map = {};
    filteredTasks.forEach((t) => {
      if (!map[t.workstream]) {
        map[t.workstream] = {
          name: t.workstream,
          items: [],
          start: new Date(t.startDate),
          end: new Date(t.endDate),
          minProgress: t.progress ?? 0,
        };
      }
      const ws = map[t.workstream];
      ws.items.push(t);
      ws.start = new Date(Math.min(ws.start, new Date(t.startDate)));
      ws.end = new Date(Math.max(ws.end, new Date(t.endDate)));
      ws.minProgress = Math.min(ws.minProgress, t.progress ?? 0);
    });
    return Object.values(map);
  }, [filteredTasks]);

  // ================= BAR POSITION =================
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

  // ================= TIME MARKERS =================
  const timeMarkers = [];
  if (viewStart) {
    if (viewMode === "monthly") {
      const d = new Date(viewStart);
      d.setDate(1);
      for (let i = 0; i <= months; i++) {
        const m = new Date(d);
        m.setMonth(d.getMonth() + i);
        timeMarkers.push(m);
      }
    } else {
      for (let i = 0; i <= weeks * 7; i += 7) {
        timeMarkers.push(new Date(viewStart.getTime() + i * DAY));
      }
    }
  }

  const today = new Date();
  const showTodayLine =
    showToday &&
    viewStart &&
    today >= viewStart &&
    today <= viewEnd;

  const ownerOptions = [...new Set(tasks.map((t) => t.owner).filter(Boolean))];

  // ================= PROGRAM HEALTH =================
  const programHealth = useMemo(() => {
    const atRiskWs = new Set();
    let blockedCount = 0;

    filteredTasks.forEach((t) => {
      if (t.status === "Delayed" || t.status === "Blocked") {
        atRiskWs.add(t.workstream);
      }
      if (t.status === "Blocked") blockedCount++;
    });

    const executable = filteredTasks.filter(
      (t) =>
        t.status === "WIP" &&
        (t.progress ?? 0) >= 60 &&
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
      atRiskCount: atRiskWs.size,
      blockedCount,
      confidence,
    };
  }, [filteredTasks, today]);

  const applyAtRiskFilter = () => {
    setFilters({
      workstream: "",
      deliverable: "",
      owner: "",
      status: "Delayed",
    });
  };

  const applyBlockedFilter = () => {
    setFilters({
      workstream: "",
      deliverable: "",
      owner: "",
      status: "Blocked",
    });
  };

  return (
    <div className="p-6 text-sm">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-xl font-semibold">
          Program Intelligence
        </h2>

        <button
          className="btn-primary btn-xs"
          onClick={() => navigate("/infra-intelligence")}
        >
          Click to view Infra Setup Timeline
        </button>
      </div>

      {/* FILTERS */}
      <div className="flex flex-wrap gap-3 mb-3 text-xs items-center">
        <input
          placeholder="Workstream"
          value={filters.workstream}
          onChange={(e) =>
            setFilters({ ...filters, workstream: e.target.value })
          }
          className="px-2 py-1 border rounded w-40"
        />
        <input
          placeholder="Deliverable"
          value={filters.deliverable}
          onChange={(e) =>
            setFilters({ ...filters, deliverable: e.target.value })
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
          <option>WIP</option>
          <option>Delayed</option>
          <option>Blocked</option>
          <option>Closed</option>
        </select>

        <button
          className="btn-secondary btn-xs"
          onClick={() =>
            setFilters({
              workstream: "",
              deliverable: "",
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

        {viewMode === "weekly" && (
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
        )}

        {viewMode === "monthly" && (
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
          className="btn-outline btn-xs"
          onClick={() =>
            setViewMode((m) => (m === "weekly" ? "monthly" : "weekly"))
          }
        >
          {viewMode === "weekly" ? "Monthly View" : "Weekly View"}
        </button>
      </div>

      {/* ================= GANTT ================= */}
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
            {timeMarkers.map((d) => {
              const rawLeft = ((d - viewStart) / viewDuration) * 100;
              const left = Math.min(Math.max(rawLeft, 0), 96);
              return (
                <span
                  key={d}
                  className="absolute"
                  style={{ left: `${left}%` }}
                >
                  {viewMode === "monthly" ? fmtMonth(d) : fmt(d)}
                </span>
              );
            })}
          </div>

          <div className="bg-white rounded shadow p-3 space-y-2 overflow-hidden">
            {workstreams.map((ws) => {
              const wsBar = barStyle(ws.start, ws.end);

              return (
                <div key={ws.name}>
                  <div className="flex gap-3 items-center mb-1">
                    <button
                      className="w-4"
                      onClick={() =>
                        setExpanded((e) => ({
                          ...e,
                          [ws.name]: !e[ws.name],
                        }))
                      }
                    >
                      {expanded[ws.name] ? "▾" : "▸"}
                    </button>

                    <div className="w-44 truncate font-medium">
                      {ws.name}
                    </div>

                    <div className="relative flex-1 h-2.5 bg-gray-100 rounded overflow-hidden">
                      {wsBar && (
                        <div
                          className="absolute h-2.5 rounded"
                          style={{
                            ...wsBar,
                            background: `linear-gradient(
                              to right,
                              #16a34a 0%,
                              #16a34a ${ws.minProgress}%,
                              #dc2626 ${ws.minProgress}%,
                              #dc2626 100%
                            )`,
                          }}
                          title={`Workstream: ${ws.name}
Start: ${fmt(ws.start)}
End: ${fmt(ws.end)}
Min Progress: ${ws.minProgress}%`}
                        />
                      )}
                    </div>
                  </div>

                  {expanded[ws.name] &&
                    ws.items.map((t) => {
                      const dBar = barStyle(
                        new Date(t.startDate),
                        new Date(t.endDate)
                      );
                      if (!dBar) return null;

                      return (
                        <div key={t.id} className="flex gap-3 ml-6 mb-1">
                          <div className="w-44 truncate text-[11px]">
                            {t.deliverable}
                          </div>

                          <div className="relative flex-1 h-1.5 bg-gray-100 rounded overflow-hidden">
                            <div
                              className="absolute h-1.5 rounded"
                              style={{
                                ...dBar,
                                background: `linear-gradient(
                                  to right,
                                  #16a34a 0%,
                                  #16a34a ${t.progress}%,
                                  #dc2626 ${t.progress}%,
                                  #dc2626 100%
                                )`,
                              }}
                              title={`Deliverable: ${t.deliverable}
Owner: ${t.owner}
Status: ${t.status}
Start: ${fmt(t.startDate)}
End: ${fmt(t.endDate)}
Progress: ${t.progress}%`}
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

      {/* ================= PROGRAM HEALTH SNAPSHOT ================= */}
      <div className="mt-6 bg-white rounded shadow p-4">
        <h3 className="text-sm font-semibold mb-3">
          Program Health Snapshot
        </h3>

        <div className="grid grid-cols-4 gap-4 text-xs">
          <div>
            <div className="text-gray-500">Execution Health</div>
            <div className="text-lg font-semibold text-red-600">
              {programHealth.executionHealth}%
            </div>
          </div>

          <div>
            <div className="text-gray-500">At-Risk Workstreams</div>
            <button
              onClick={applyAtRiskFilter}
              className="text-lg font-semibold text-red-600 underline"
            >
              {programHealth.atRiskCount}
            </button>
          </div>

          <div>
            <div className="text-gray-500">Critical Blockers</div>
            <button
              onClick={applyBlockedFilter}
              className="text-lg font-semibold text-red-700 underline"
            >
              {programHealth.blockedCount}
            </button>
          </div>

          <div>
            <div className="text-gray-500">Delivery Confidence</div>
            <div className="text-lg font-semibold text-red-600">
              {programHealth.confidence}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
