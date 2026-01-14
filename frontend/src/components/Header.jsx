import customerLogo from "../assets/customer-logo.png";
import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function Header() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

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
    <div className="flex items-center w-full">
      {/* LEFT: App Title */}
      <h1 className="text-xl font-medium tracking-tight text-gray-900">GCC Control Tower</h1>

      {/* PROFILE CHIP (right side) */}
      <div className="ml-auto flex items-center gap-4 pr-4">
        {user ? (
          <div className="flex items-center gap-3 bg-white p-2 rounded shadow-sm">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="avatar" className="w-9 h-9 rounded-full object-cover" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-sm">
                {user.name ? user.name.split(" ").map(n => n[0]).slice(0,2).join('') : (user.email||'U')[0].toUpperCase()}
              </div>
            )}
            <div className="flex flex-col">
              <div className="text-sm text-gray-700">{user.name || user.email}</div>
              <div className="text-xs text-gray-500">{user.role}</div>
              {user.role === "admin" && (
                <button
                  type="button"
                  onClick={() => navigate("/admin-approvals")}
                  className="mt-1 text-xs text-sky-700 hover:text-sky-900 underline text-left"
                >
                  View pending approvals
                </button>
              )}
            </div>
            <button onClick={logout} title="Logout" className="ml-2 text-gray-500 hover:text-red-600 p-1 rounded">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6A2.25 2.25 0 005.25 5.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3-6l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="text-gray-500">&nbsp;</div>
        )}

        {/* LOGO (further right) */}
        <div className="flex items-center pr-2 border-l border-gray-200 pl-4">
          <img src={customerLogo} alt="Customer Logo" style={{ height: "28px", objectFit: "contain", opacity: 0.95 }} />
        </div>
      </div>
    </div>
  );
}