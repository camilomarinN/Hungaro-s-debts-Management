import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../services/api";
import { showAlert, showLoading, closeLoading } from "../utils/alerts";

const TIPO_VACIO = { id_tipo_producto: null, nombre_tipo_producto: "" };
const inputClass = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#A3C9A8]";
const buildQuery = (params) => {
  const q = Object.entries(params).filter(([, v]) => v !== "").map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
  return q ? `?${q}` : "";
};

export default function TipoProductos() {
  const navigate = useNavigate();
  const [tipos, setTipos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtroNombre, setFiltroNombre] = useState("");
  const debounceRef = useRef(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modo, setModo] = useState("crear");
  const [tipoActual, setTipoActual] = useState(TIPO_VACIO);

  const obtenerTipos = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/tipo_productos/${buildQuery(params)}`);
      if (!res) return;
      const data = await res.json();
      setTipos(data.data || []);
    } catch {
      showAlert("Error", "No se pudieron cargar los tipos de producto", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { obtenerTipos(); }, [obtenerTipos]);
  const onFiltroChange = (valor) => {
    setFiltroNombre(valor);
    clearTimeout(debounceRef.current);
    if (!valor.trim()) { debounceRef.current = setTimeout(() => obtenerTipos(), 200); return; }
    if (valor.trim().length < 3) return;
    debounceRef.current = setTimeout(() => obtenerTipos({ nombre: valor.trim() }), 300);
  };
  const limpiarFiltro = () => { setFiltroNombre(""); clearTimeout(debounceRef.current); obtenerTipos(); };
  const abrirCrear = () => { setModo("crear"); setTipoActual(TIPO_VACIO); setIsModalOpen(true); };
  const abrirEditar = (t) => { setModo("editar"); setTipoActual({ ...t }); setIsModalOpen(true); };
  const cerrarModal = () => setIsModalOpen(false);
  const validar = () => {
    if (!tipoActual.nombre_tipo_producto.trim()) { showAlert("Validación", "El nombre es obligatorio", "warning"); return false; }
    return true;
  };
  const crearTipo = async () => {
    if (!validar()) return;
    showLoading("Creando tipo...");
    try {
      const res = await apiFetch("/api/tipo_productos/", { method: "POST", body: JSON.stringify({ nombre_tipo_producto: tipoActual.nombre_tipo_producto }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error al crear tipo");
      closeLoading(); cerrarModal(); obtenerTipos(filtroNombre.trim().length >= 3 ? { nombre: filtroNombre.trim() } : {});
      showAlert("Éxito", "Tipo creado correctamente", "success");
    } catch (err) { closeLoading(); showAlert("Error", err.message, "error"); }
  };
  const actualizarTipo = async () => {
    if (!validar()) return;
    showLoading("Actualizando tipo...");
    try {
      const res = await apiFetch(`/api/tipo_productos/${tipoActual.id_tipo_producto}/`, { method: "PUT", body: JSON.stringify({ nombre_tipo_producto: tipoActual.nombre_tipo_producto }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error al actualizar tipo");
      closeLoading(); cerrarModal(); obtenerTipos(filtroNombre.trim().length >= 3 ? { nombre: filtroNombre.trim() } : {});
      showAlert("Éxito", "Tipo actualizado correctamente", "success");
    } catch (err) { closeLoading(); showAlert("Error", err.message, "error"); }
  };
  const eliminarTipo = async (id) => {
    const confirm = await showAlert("¿Eliminar tipo?", "Los productos asociados quedarán sin categoría", "warning");
    if (!confirm.isConfirmed) return;
    showLoading("Eliminando...");
    try {
      const res = await apiFetch(`/api/tipo_productos/${id}/`, { method: "DELETE" });
      closeLoading();
      if (!res.ok) throw new Error("Error al eliminar el tipo");
      obtenerTipos(filtroNombre.trim().length >= 3 ? { nombre: filtroNombre.trim() } : {});
      showAlert("Eliminado", "Tipo eliminado correctamente", "success");
    } catch (err) { closeLoading(); showAlert("Error", err.message, "error"); }
  };
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/app/productos")} className="text-gray-400 hover:text-gray-700 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
          </button>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Productos</p>
            <h1 className="text-2xl font-bold text-gray-800">Tipos de producto</h1>
          </div>
        </div>
        <button onClick={abrirCrear} className="bg-[#557b5a] hover:bg-[#3f5e44] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">+ Nuevo tipo</button>
      </div>
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
        <div className="flex gap-3 items-end">
          <div className="flex-1 max-w-sm">
            <label className="block text-xs text-gray-500 mb-1">Buscar por nombre</label>
            <input type="text" placeholder="Escribe 3+ letras..." value={filtroNombre} onChange={(e) => onFiltroChange(e.target.value)} className={inputClass}/>
          </div>
          {filtroNombre && <button onClick={limpiarFiltro} className="px-3 py-2 text-sm text-gray-500 hover:text-gray-800 underline">Limpiar</button>}
        </div>
      </div>
      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando tipos...</div>
      ) : tipos.length === 0 ? (
        <div className="text-center py-12 text-gray-400">{filtroNombre ? "Sin resultados para ese nombre" : "No hay tipos registrados"}</div>
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
              {tipos.map((t) => (
                <tr key={t.id_tipo_producto} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-500">#{t.id_tipo_producto}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{t.nombre_tipo_producto}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-3">
                      <button onClick={() => abrirEditar(t)} className="text-blue-600 hover:text-blue-800 text-xs underline">Editar</button>
                      <button onClick={() => eliminarTipo(t.id_tipo_producto)} className="text-red-500 hover:text-red-700 text-xs underline">Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-4 flex justify-end">
        <span className="text-sm text-gray-400">{tipos.length} tipo{tipos.length !== 1 ? "s" : ""}{filtroNombre ? " encontrados" : " registrados"}</span>
      </div>
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">{modo === "crear" ? "Nuevo tipo" : `Editar tipo #${tipoActual.id_tipo_producto}`}</h2>
              <button onClick={cerrarModal} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
            </div>
            <div className="px-6 py-5">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre <span className="text-red-500">*</span></label>
              <input type="text" maxLength={50} placeholder="Ej: Bebidas, Platos fuertes, Postres..." value={tipoActual.nombre_tipo_producto} onChange={(e) => setTipoActual({ ...tipoActual, nombre_tipo_producto: e.target.value })} className={inputClass}/>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={cerrarModal} className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm">Cancelar</button>
              <button onClick={modo === "crear" ? crearTipo : actualizarTipo} className="px-4 py-2 rounded-lg bg-[#557b5a] hover:bg-[#3f5e44] text-white text-sm font-medium">
                {modo === "crear" ? "Crear tipo" : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}