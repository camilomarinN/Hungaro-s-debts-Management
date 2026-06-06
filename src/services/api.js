import { showAlert } from "../utils/alerts";

export const apiFetch = async (endpoint, options = {}) => {
  const token = localStorage.getItem("token");

  const response = await fetch(`${import.meta.env.VITE_API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Token ${token}` }),
      ...options.headers,
    },
  });

  if (response.status === 401 || response.status === 403) {
    if (!window.location.pathname.includes("/login")) {
      localStorage.clear();

      await showAlert(
        "Sesión expirada",
        "Tu sesión ha expirado, por favor inicia sesión nuevamente",
        "warning",
      );

      window.location.href = "/login";
    }
    return;
  }

  return response;
};
