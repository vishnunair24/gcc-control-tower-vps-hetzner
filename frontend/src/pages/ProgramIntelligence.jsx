import { useEffect, useMemo, useState } from "react";
import axios from "axios";

const DAY = 24 * 60 * 60 * 1000;

const fmt = (d) =>
  new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const colorByProgress = (p = 0) => {
  if (p < 30) return "#dc2626";
  if (p < 60) return "#f59e0b";
  if (p < 90) return "#2563eb";
  return "#16a34a";
};

export default function ProgramIntelligence() {
  const [tasks, setTasks] = useState([]);

  // timeline controls
  const [useCustomStart, setUseCustomStart] = useState(false);
  const [customStart, setCustomStart] = useState("");
  const [weeks, setWeeks] = useState(5);
  const [showToday, setShowToday] = useState(true);

  // ui state
  const [expanded, setExpanded] = useState({});
  const [filters, setFilters] = useState({
    workstream: "",
    deliverable: "",
    owner: "",
    status: "",
  });

  useEffect(() => {
    axios.get("http://localhost:4000/tasks").then((res) => {
      setTasks(res.data || []);
    });
  }, []);

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

  const viewDays = weeks * 7;
  const viewEnd =
    viewStart && new Date(viewStart.getTime() + viewDays * DAY);
  const viewDuration =
    viewStart && viewEnd ? viewEnd - viewStart : 0;

  const filteredTasks = useMemo(() => {
    return validTasks.filter((t) =>
      (!filters.workstream ||
        t.workstream
          .toLowerCase()
          .includes(filters.workstream.toLowerCase())) &&
      (!filters.deliverable ||
        t.deliverable
          ?.toLowerCase()
          .includes(filters.deliverable.toLowerCase())) &&
      (!filters.owner || t.owner === filters.owner) &&
      (!filters.status || t.status === filters.status)
    );
  }, [validTasks, filters]);

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

  const weekMarkers = [];
  if (viewStart) {
    for (let i = 0; i <= viewDays; i += 7) {
      weekMarkers.push(new Date(viewStart.getTime() + i * DAY));
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

  return (
    <div className="p-6 text-sm">
      <h2 className="text-xl font-semibold mb-3">
        Program Intelligence
      </h2>

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

        <div className="flex items-center gap-1">
          <input
            type="number"
            min={1}
            step={1}
            value={weeks}
            onChange={(e) =>
              setWeeks(
                Math.max(
                  1,
                  Math.floor(Number(e.target.value || 1))
                )
              )
            }
            className="w-16 px-1 border rounded"
          />
          <span className="text-gray-500">weeks</span>
        </div>

        <label>
          <input
            type="checkbox"
            checked={showToday}
            onChange={(e) => setShowToday(e.target.checked)}
          />{" "}
          Show today
        </label>
      </div>

      {viewStart && (
        <div className="relative">
          {/* TODAY LINE – FULL HEIGHT, ANIMATED */}
          {showTodayLine && (
            <div
              className="absolute top-0 bottom-0 w-[2px] bg-blue-400 opacity-60 z-30 animate-pulse pointer-events-none"
              style={{
                left: `${
                  ((today - viewStart) / viewDuration) * 100
                }%`,
              }}
              title="Today"
            />
          )}

          {/* WEEK HEADER */}
          <div className="relative h-6 mb-2 ml-52 text-[11px] text-gray-500 overflow-hidden">
            {weekMarkers.map((w) => {
              const rawLeft =
                ((w - viewStart) / viewDuration) * 100;
              const left = Math.min(Math.max(rawLeft, 0), 96);
              return (
                <span
                  key={w}
                  className="absolute"
                  style={{ left: `${left}%` }}
                >
                  {fmt(w)}
                </span>
              );
            })}
          </div>

          {/* GANTT */}
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
                            backgroundColor: colorByProgress(
                              ws.minProgress
                            ),
                          }}
                          title={`Start: ${fmt(ws.start)}
End: ${fmt(ws.end)}
Progress: ${ws.minProgress}%`}
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
                        <div
                          key={t.id}
                          className="flex gap-3 ml-6 mb-1"
                        >
                          <div className="w-44 truncate text-[11px]">
                            {t.deliverable}
                          </div>

                          <div className="relative flex-1 h-1.5 bg-gray-100 rounded overflow-hidden">
                            <div
                              className="absolute h-1.5 rounded"
                              style={{
                                ...dBar,
                                backgroundColor: colorByProgress(
                                  t.progress
                                ),
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
    </div>
  );
}
