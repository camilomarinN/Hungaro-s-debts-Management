import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../services/api";
import { showAlert, showLoading, closeLoading } from "../utils/alerts";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [idUsuario, setIdUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (loading) return;

    setLoading(true);
    showLoading("Ingresando...");

    try {
      const response = await apiFetch("/api/login/", {
        method: "POST",
        body: JSON.stringify({
          id_usuario: idUsuario,
          password: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Credenciales incorrectas");
      }

      login(data);
      closeLoading();

      await showAlert(
        "Bienvenido",
        `Hola ${data.usuario.nombre}`,
        "success"
      );

      navigate("/");

    } catch (err) {
      closeLoading();
      showAlert("Error", err.message, "error");

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow w-80">
      <h2 className="text-xl font-bold mb-4">Iniciar sesión</h2>

      <input
        className="w-full mb-3 p-2 border rounded"
        placeholder="Usuario"
        value={idUsuario}
        onChange={(e) => setIdUsuario(e.target.value)}
      />

      <input
        className="w-full mb-3 p-2 border rounded"
        type="password"
        placeholder="Contraseña"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button
        onClick={handleLogin}
        disabled={loading}
        className="w-full bg-[#A3C9A8] hover:bg-[#557b5a] disabled:opacity-60 text-white p-2 rounded"
      >
        {loading ? "Ingresando..." : "Entrar"}
      </button>
    </div>
  );
}