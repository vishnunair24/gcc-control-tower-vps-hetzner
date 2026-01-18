import { useEffect, useState } from "react";
import api from "../api";
import { useNavigate, useLocation } from "react-router-dom";

export default function Header() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const isLanding = location.pathname === "/employee-home";
  
  // Determine current customer from query string for dynamic logo
  const searchParams = new URLSearchParams(location.search);
  const customerNameFromQuery = searchParams.get("customerName");

  const customerLogos = {
    Infinite: "/client-logos/Infinite.png",
    VIP: "/client-logos/VIP.png",
    Routeware: "/client-logos/Routeware.png",
    Nasuni: "/client-logos/Nasuni.png",
    Acumatica: "/client-logos/Acumatica.png",
    Alkami: "/client-logos/Alkami.png",
    Comply: "/client-logos/Comply.png",
  };

  // For employees/admins, use customerName from the URL.
  // For customers, always use the customerName tied to their account.
  const effectiveCustomerName =
    user && user.role === "customer"
      ? user.customerName || null
      : customerNameFromQuery || null;

  const currentCustomerLogo =
    effectiveCustomerName && customerLogos[effectiveCustomerName]
      ? customerLogos[effectiveCustomerName]
      : null;

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.get("/auth/me");
        if (mounted) setUser(res.data);
      } catch (e) {
        if (mounted) setUser(null);
      }
    })();
    return () => (mounted = false);
  }, []);

  const logout = async () => {
    try {
      await api.post("/auth/logout", {});
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

        {/* Go back to Home (customer selection) for employees/admins, but hide on landing */}
        {user && (user.role === "employee" || user.role === "admin") && !isLanding && (
          <button
            type="button"
            onClick={() => navigate("/employee-home")}
            className="px-3 py-1 text-xs font-medium rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          >
            Go back to Home
          </button>
        )}
        {/* Dynamic customer logo on non-landing pages */}
        {!isLanding && currentCustomerLogo && (
          <div className="flex items-center pr-2 border-l border-gray-200 pl-4">
            <img
              src={currentCustomerLogo}
              alt={effectiveCustomerName || "Customer Logo"}
              style={{ height: "28px", objectFit: "contain", opacity: 0.95 }}
            />
          </div>
        )}

      </div>
    </div>
  );
}