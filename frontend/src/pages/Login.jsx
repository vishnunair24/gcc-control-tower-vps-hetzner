import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    // Minimal placeholder auth: accept any credentials
    localStorage.setItem("auth", "true");
    navigate("/dashboard");
  };

  return (
    <div className="max-w-md mx-auto mt-24 bg-white p-6 rounded shadow">
      <h2 className="text-2xl font-semibold mb-4">Sign in to GCC Control Tower</h2>
      <form onSubmit={handleSubmit}>
        <label className="block text-sm font-medium text-gray-700">Username</label>
        <input
          className="w-full mt-1 mb-3 p-2 border rounded"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />

        <label className="block text-sm font-medium text-gray-700">Password</label>
        <input
          type="password"
          className="w-full mt-1 mb-4 p-2 border rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button
          type="submit"
          className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700"
        >
          Sign in
        </button>
      </form>
    </div>
  );
}
