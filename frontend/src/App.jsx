import { Routes, Route, Navigate } from "react-router-dom";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Tracker from "./pages/Tracker";
import ProgramIntelligence from "./pages/ProgramIntelligence";

function App() {
  return (
    <div>
      {/* Fixed Sidebar */}
      <Sidebar />

      {/* Main content shifted right to match sidebar width */}
      <div className="ml-52">
        <Header />

        <main className="p-6 bg-gray-100 min-h-screen">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/tracker" element={<Tracker />} />
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
