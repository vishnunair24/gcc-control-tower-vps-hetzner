import { Link, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";

function Layout() {
  const location = useLocation();
  const [user, setUser] = useState(null);

  const linkClass = (path) =>
    `block px-4 py-2 rounded ${
      location.pathname === path
        ? "bg-blue-600 text-white"
        : "text-gray-700 hover:bg-gray-100"
    }`;

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await axios.get("http://localhost:3001/auth/me", { withCredentials: true });
        if (mounted) setUser(res.data);
      } catch (e) {
        if (mounted) setUser(null);
      }
    })();
    return () => (mounted = false);
  }, []);

  const logout = async () => {
    try {
      await axios.post("http://localhost:3001/auth/logout", {}, { withCredentials: true });
    } catch (e) {
      console.error("Logout failed", e);
    }
    window.location.href = "/login.html";
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* SIDEBAR */}
      <aside className="w-64 bg-white shadow">
        <div className="p-4 text-xl font-semibold border-b">GCC Control Tower</div>

        <nav className="p-4 space-y-2">
          <Link to="/dashboard" className={linkClass("/dashboard")}>
            Executive Dashboard
          </Link>

          <Link to="/tracker" className={linkClass("/tracker")}>
            Task Tracker
          </Link>
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-6">
        <div className="flex justify-end mb-4">
          <div className="bg-white p-2 rounded shadow text-sm flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt="avatar" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-sm">
                        {user.name ? user.name.split(' ').map(n => n[0]).slice(0,2).join('') : (user.email||'U')[0].toUpperCase()}
                      </div>
                    )}

                    <div className="flex flex-col">
                      <div className="text-gray-700 text-sm">{user.name || user.email}</div>
                      <div className="text-xs text-gray-500 px-2 py-0.5 rounded bg-gray-100 inline-block">{user.role}</div>
                    </div>
                  </div>

                  <button onClick={logout} title="Logout" aria-label="Logout" className="text-gray-500 hover:text-red-600 p-2 rounded-md border border-transparent hover:border-red-100">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6A2.25 2.25 0 005.25 5.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3-6l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-gray-500">Not signed in</div>
            )}
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
