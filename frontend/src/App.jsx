import { Routes, Route, Navigate } from "react-router-dom";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Tracker from "./pages/Tracker";
import ProgramIntelligence from "./pages/ProgramIntelligence";
import InfraTracker from "./pages/InfraTracker";

import summitLogo from "./assets/summit-logo.png";

const HEADER_HEIGHT = 56; // single frozen header height
const HEADER_BG_COLOR = "#ffffff";

function App() {
  return (
    <div>
      {/* Fixed Sidebar */}
      <Sidebar />

      {/* Main content shifted right to match sidebar width */}
      <div className="ml-52">
        {/* 🔒 FIXED HEADER BAR (TITLE + LOGO SAME LINE) */}
        <div
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            left: "13rem", // matches ml-52 (52 * 0.25rem = 13rem)
            height: HEADER_HEIGHT,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 20px",
            background: HEADER_BG_COLOR,
            borderBottom: "1px solid #e5e7eb",
            zIndex: 50,
          }}
        >
          {/* EXISTING HEADER (LEFT) */}
          <Header />

          {/* LOGO (RIGHT) */}
          <img
            src={summitLogo}
            alt="Summit Consulting"
            style={{
              height: "40px", // ✅ balanced, visible, professional
              objectFit: "contain",
            }}
          />
        </div>

        {/* PAGE CONTENT (OFFSET FOR FIXED HEADER) */}
        <main
          className="p-6 bg-gray-100 min-h-screen"
          style={{ marginTop: HEADER_HEIGHT }}
        >
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/tracker" element={<Tracker />} />
            <Route path="/infra-tracker" element={<InfraTracker />} />
            <Route
              path="/program-intelligence"
              element={<ProgramIntelligence />}
            />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
