import { useEffect, useState } from "react";
import { apiFetch } from "../services/api";
import { showAlert, showLoading, closeLoading } from "../utils/alerts";

export default function Roles() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modo, setModo] = useState("crear");
  const [rolActual, setRolActual] = useState({ id_rol: null, nombre_rol: "" });

  const obtenerRoles = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/roles/");
      if (!res) return;
      const data = await res.json();
      setRoles(data.data || []);
    } catch {
      showAlert("Error", "No se pudieron cargar los roles", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { obtenerRoles(); }, []);

  const abrirCrear = () => { setModo("crear"); setRolActual({ id_rol: null, nombre_rol: "" }); setIsModalOpen(true); };
  const abrirEditar = (rol) => { setModo("editar"); setRolActual(rol); setIsModalOpen(true); };
  const cerrarModal = () => setIsModalOpen(false);

  const crearRol = async () => {
    if (!rolActual.nombre_rol.trim()) return showAlert("Validación", "El nombre del rol es obligatorio", "warning");
    showLoading("Creando rol...");
    try {
      const res = await apiFetch("/api/roles/", { method: "POST", body: JSON.stringify({ nombre_rol: rolActual.nombre_rol }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error al crear rol");
      closeLoading(); cerrarModal(); obtenerRoles();
      showAlert("Éxito", "Rol creado correctamente", "success");
    } catch (err) { closeLoading(); showAlert("Error", err.message, "error"); }
  };

  const actualizarRol = async () => {
    if (!rolActual.nombre_rol.trim()) return showAlert("Validación", "El nombre del rol es obligatorio", "warning");
    showLoading("Actualizando rol...");
    try {
      const res = await apiFetch(`/api/roles/${rolActual.id_rol}/`, { method: "PUT", body: JSON.stringify({ nombre_rol: rolActual.nombre_rol }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error al actualizar rol");
      closeLoading(); cerrarModal(); obtenerRoles();
      showAlert("Éxito", "Rol actualizado correctamente", "success");
    } catch (err) { closeLoading(); showAlert("Error", err.message, "error"); }
  };

  const eliminarRol = async (id) => {
    const confirm = await showAlert("¿Eliminar rol?", "Esta acción no se puede deshacer", "warning");
    if (!confirm.isConfirmed) return;
    showLoading("Eliminando...");
    try {
      const res = await apiFetch(`/api/roles/${id}/`, { method: "DELETE" });
      closeLoading();
      if (!res.ok) throw new Error("Error al eliminar el rol");
      obtenerRoles();
      showAlert("Eliminado", "Rol eliminado correctamente", "success");
    } catch (err) { closeLoading(); showAlert("Error", err.message, "error"); }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Roles</h1>
        <button onClick={abrirCrear} className="bg-[#557b5a] hover:bg-[#3f5e44] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">+ Nuevo rol</button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando roles...</div>
      ) : roles.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No hay roles registrados</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {roles.map((rol) => (
                <tr key={rol.id_rol} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-500">#{rol.id_rol}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{rol.nombre_rol}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-3">
                      <button onClick={() => abrirEditar(rol)} className="text-blue-600 hover:text-blue-800 text-xs underline">Editar</button>
                      <button onClick={() => eliminarRol(rol.id_rol)} className="text-red-500 hover:text-red-700 text-xs underline">Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">{modo === "crear" ? "Nuevo rol" : "Editar rol"}</h2>
              <button onClick={cerrarModal} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
            </div>
            <div className="px-6 py-5">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del rol <span className="text-red-500">*</span></label>
              <input type="text" placeholder="Ej: administrador" value={rolActual.nombre_rol} onChange={(e) => setRolActual({ ...rolActual, nombre_rol: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#A3C9A8]"/>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={cerrarModal} className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm">Cancelar</button>
              <button onClick={modo === "crear" ? crearRol : actualizarRol} className="px-4 py-2 rounded-lg bg-[#557b5a] hover:bg-[#3f5e44] text-white text-sm font-medium">{modo === "crear" ? "Crear rol" : "Guardar cambios"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}