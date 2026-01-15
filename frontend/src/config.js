const defaultBase =
	typeof window !== "undefined" && window.location.hostname === "localhost"
		? "http://localhost:4000"
		: "https://gcc-control-tower-login.onrender.com";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || defaultBase;