import { Link } from "react-router-dom";

function Sidebar() {
  return (
    <aside className="w-60 bg-gray-900 text-white min-h-screen p-4">
      <h2 className="text-lg font-semibold mb-6">Navigation</h2>

      <nav className="space-y-3">
        <Link to="/dashboard" className="block hover:text-gray-300">
          Dashboard
        </Link>
        <Link to="/tracker" className="block hover:text-gray-300">
          Tracker
        </Link>
      </nav>
    </aside>
  );
}

export default Sidebar;
