import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../services/api";
import { showAlert, showLoading, closeLoading } from "../utils/alerts";

const PRODUCTO_VACIO = { id_producto: null, nombre_producto: "", precio_producto: "", id_tipo_producto: "" };
const formatCOP = (valor) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(valor);
const buildQuery = (params) => {
  const q = Object.entries(params).filter(([, v]) => v !== "").map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
  return q ? `?${q}` : "";
};

export default function Productos() {
  const [productos, setProductos] = useState([]);
  const [tipoProductos, setTipoProductos] = useState([]);
  const [loading, setLoading] = useState(false);

  const [filtroNombre, setFiltroNombre] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroPrecioMin, setFiltroPrecioMin] = useState("");
  const [filtroPrecioMax, setFiltroPrecioMax] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modo, setModo] = useState("crear");
  const [productoActual, setProductoActual] = useState(PRODUCTO_VACIO);

  const obtenerProductos = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/productos/${buildQuery(params)}`);
      if (!res) return;
      const data = await res.json();
      setProductos(data.data || []);
    } catch {
      showAlert("Error", "No se pudieron cargar los productos", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  const obtenerTipos = useCallback(async () => {
    try {
      const res = await apiFetch("/api/tipo_productos/");
      if (!res) return;
      const data = await res.json();
      setTipoProductos(data.data || []);
    } catch {
      showAlert("Error", "No se pudieron cargar los tipos", "error");
    }
  }, []);

  useEffect(() => { obtenerProductos(); obtenerTipos(); }, [obtenerProductos, obtenerTipos]);

  const getNombreTipo = (id) => {
    const t = tipoProductos.find((t) => t.id_tipo_producto === Number(id));
    return t ? t.nombre_tipo_producto : "—";
  };

  const aplicarFiltros = () => obtenerProductos({ nombre: filtroNombre, tipo: filtroTipo, precio_min: filtroPrecioMin, precio_max: filtroPrecioMax });
  const limpiarFiltros = () => { setFiltroNombre(""); setFiltroTipo(""); setFiltroPrecioMin(""); setFiltroPrecioMax(""); obtenerProductos(); };

  const abrirCrear = () => { setModo("crear"); setProductoActual(PRODUCTO_VACIO); setIsModalOpen(true); };
  const abrirEditar = (p) => { setModo("editar"); setProductoActual({ ...p }); setIsModalOpen(true); };
  const abrirDetalle = (p) => { setModo("detalle"); setProductoActual({ ...p }); setIsModalOpen(true); };
  const cerrarModal = () => setIsModalOpen(false);

  const validarProducto = () => {
    if (!productoActual.nombre_producto.trim()) { showAlert("Validación", "El nombre es obligatorio", "warning"); return false; }
    if (!productoActual.precio_producto || Number(productoActual.precio_producto) <= 0) { showAlert("Validación", "El precio debe ser mayor a 0", "warning"); return false; }
    if (!productoActual.id_tipo_producto) { showAlert("Validación", "Selecciona un tipo de producto", "warning"); return false; }
    return true;
  };

  const crearProducto = async () => {
    if (!validarProducto()) return;
    showLoading("Creando producto...");
    try {
      const res = await apiFetch("/api/productos/", { method: "POST", body: JSON.stringify({ nombre_producto: productoActual.nombre_producto, precio_producto: Number(productoActual.precio_producto).toFixed(2), id_tipo_producto: Number(productoActual.id_tipo_producto) }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error al crear producto");
      closeLoading(); cerrarModal(); obtenerProductos();
      showAlert("Éxito", "Producto creado correctamente", "success");
    } catch (err) { closeLoading(); showAlert("Error", err.message, "error"); }
  };

  const actualizarProducto = async () => {
    if (!validarProducto()) return;
    showLoading("Actualizando producto...");
    try {
      const res = await apiFetch(`/api/productos/${productoActual.id_producto}/`, { method: "PUT", body: JSON.stringify({ nombre_producto: productoActual.nombre_producto, precio_producto: Number(productoActual.precio_producto).toFixed(2), id_tipo_producto: Number(productoActual.id_tipo_producto) }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error al actualizar producto");
      closeLoading(); cerrarModal(); obtenerProductos();
      showAlert("Éxito", "Producto actualizado correctamente", "success");
    } catch (err) { closeLoading(); showAlert("Error", err.message, "error"); }
  };

  const eliminarProducto = async (id) => {
    const confirm = await showAlert("¿Eliminar producto?", "Esta acción no se puede deshacer", "warning");
    if (!confirm.isConfirmed) return;
    showLoading("Eliminando...");
    try {
      const res = await apiFetch(`/api/productos/${id}/`, { method: "DELETE" });
      closeLoading();
      if (!res.ok) throw new Error("Error al eliminar el producto");
      obtenerProductos();
      showAlert("Eliminado", "Producto eliminado correctamente", "success");
    } catch (err) { closeLoading(); showAlert("Error", err.message, "error"); }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Productos</h1>
        <div className="flex gap-2">
          <Link to="/app/tipo-productos" className="border border-[#557b5a] text-[#557b5a] hover:bg-[#557b5a] hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Tipos de producto</Link>
          <button onClick={abrirCrear} className="bg-[#557b5a] hover:bg-[#3f5e44] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">+ Nuevo producto</button>
        </div>
      </div>
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Nombre</label>
            <input type="text" placeholder="Buscar por nombre" value={filtroNombre} onChange={(e) => setFiltroNombre(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#A3C9A8]"/>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Tipo</label>
            <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#A3C9A8]">
              <option value="">— Todos los tipos —</option>
              {tipoProductos.map((t) => <option key={t.id_tipo_producto} value={t.id_tipo_producto}>{t.nombre_tipo_producto}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Precio mínimo</label>
            <input type="number" min={0} placeholder="$ 0" value={filtroPrecioMin} onChange={(e) => setFiltroPrecioMin(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#A3C9A8]"/>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Precio máximo</label>
            <input type="number" min={0} placeholder="$ 999.999" value={filtroPrecioMax} onChange={(e) => setFiltroPrecioMax(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#A3C9A8]"/>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={limpiarFiltros} className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 underline">Limpiar</button>
          <button onClick={aplicarFiltros} className="px-4 py-1.5 bg-[#557b5a] hover:bg-[#3f5e44] text-white text-sm rounded-lg transition-colors">Filtrar</button>
        </div>
      </div>
      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando productos...</div>
      ) : productos.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No hay productos registrados</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Precio</th>
                <th className="px-4 py-3 font-medium text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {productos.map((p) => (
                <tr key={p.id_producto} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-500">#{p.id_producto}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{p.nombre_producto}</td>
                  <td className="px-4 py-3"><span className="bg-[#e8f0e9] text-[#3f5e44] text-xs font-medium px-2.5 py-1 rounded-full">{getNombreTipo(p.id_tipo_producto)}</span></td>
                  <td className="px-4 py-3 font-semibold text-[#557b5a]">{formatCOP(p.precio_producto)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-3">
                      <button onClick={() => abrirDetalle(p)} className="text-gray-500 hover:text-gray-800 text-xs underline">Ver</button>
                      <button onClick={() => abrirEditar(p)} className="text-blue-600 hover:text-blue-800 text-xs underline">Editar</button>
                      <button onClick={() => eliminarProducto(p.id_producto)} className="text-red-500 hover:text-red-700 text-xs underline">Eliminar</button>
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
              <h2 className="text-lg font-bold text-gray-800">
                {modo === "crear" && "Nuevo producto"}
                {modo === "editar" && `Editar producto #${productoActual.id_producto}`}
                {modo === "detalle" && `Detalle producto #${productoActual.id_producto}`}
              </h2>
              <button onClick={cerrarModal} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre <span className="text-red-500">*</span></label>
                {modo === "detalle" ? <p className="text-gray-800">{productoActual.nombre_producto}</p> : <input type="text" maxLength={50} placeholder="Ej: Bandeja paisa" value={productoActual.nombre_producto} onChange={(e) => setProductoActual({ ...productoActual, nombre_producto: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#A3C9A8]"/>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo <span className="text-red-500">*</span></label>
                {modo === "detalle" ? (
                  <span className="bg-[#e8f0e9] text-[#3f5e44] text-xs font-medium px-2.5 py-1 rounded-full">{getNombreTipo(productoActual.id_tipo_producto)}</span>
                ) : (
                  <select value={productoActual.id_tipo_producto} onChange={(e) => setProductoActual({ ...productoActual, id_tipo_producto: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#A3C9A8]">
                    <option value="">— Selecciona un tipo —</option>
                    {tipoProductos.map((t) => <option key={t.id_tipo_producto} value={t.id_tipo_producto}>{t.nombre_tipo_producto}</option>)}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Precio (COP) <span className="text-red-500">*</span></label>
                {modo === "detalle" ? <p className="text-[#557b5a] font-bold text-lg">{formatCOP(productoActual.precio_producto)}</p> : <input type="number" min={0} step="0.01" placeholder="0" value={productoActual.precio_producto} onChange={(e) => setProductoActual({ ...productoActual, precio_producto: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#A3C9A8]"/>}
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={cerrarModal} className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm">{modo === "detalle" ? "Cerrar" : "Cancelar"}</button>
              {modo !== "detalle" && <button onClick={modo === "crear" ? crearProducto : actualizarProducto} className="px-4 py-2 rounded-lg bg-[#557b5a] hover:bg-[#3f5e44] text-white text-sm font-medium">{modo === "crear" ? "Crear producto" : "Guardar cambios"}</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}