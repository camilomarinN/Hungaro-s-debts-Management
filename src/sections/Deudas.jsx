import { useEffect, useState, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import { apiFetch } from "../services/api";
import { showAlert, showLoading, closeLoading } from "../utils/alerts";

const FIADO_VACIO = { id_fiado: null, id_usuario_fiado: "", fecha_fiado: new Date().toISOString().split("T")[0], valor_fiado: "", descripcion_fiado: "" };
const inputClass = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#A3C9A8]";
const formatCOP = (valor) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(valor);
const buildQuery = (params) => {
  const q = Object.entries(params).filter(([, v]) => v !== "").map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
  return q ? `?${q}` : "";
};

function AutocompleteInput({ placeholder, value, onChange, onSelect, options, loading }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <input type="text" placeholder={placeholder} value={value} onChange={(e) => { onChange(e.target.value); setOpen(true); }} onFocus={() => value.length >= 3 && setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} className={inputClass}/>
      {open && value.length >= 3 && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
          {loading ? <p className="px-3 py-2 text-sm text-gray-400">Buscando...</p>
          : options.length === 0 ? <p className="px-3 py-2 text-sm text-gray-400">Sin resultados</p>
          : options.map((opt) => (
            <button key={opt.value} onMouseDown={(e) => { e.preventDefault(); onSelect(opt); setOpen(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors">{opt.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Deudas() {
  const { state } = useLocation();

  const [fiados, setFiados] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filtro de cliente
  const [clienteFiltroId, setClienteFiltroId] = useState(state?.filtroCliente || "");
  const [clienteFiltroLabel, setClienteFiltroLabel] = useState(state?.filtroNombre || "");
  const [clienteFiltroOpciones, setClienteFiltroOpciones] = useState([]);
  const [loadingClienteFiltro, setLoadingClienteFiltro] = useState(false);
  const debounceFiltroRef = useRef(null);

  const [filtroFechaDesde, setFiltroFechaDesde] = useState("");
  const [filtroFechaHasta, setFiltroFechaHasta] = useState("");

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modo, setModo] = useState("crear");
  const [fiadoActual, setFiadoActual] = useState(FIADO_VACIO);

  // Autocomplete de cliente dentro del modal (crear/editar)
  const [clienteModalLabel, setClienteModalLabel] = useState("");
  const [clienteModalOpciones, setClienteModalOpciones] = useState([]);
  const [loadingClienteModal, setLoadingClienteModal] = useState(false);
  const debounceModalRef = useRef(null);

  const [lineasProducto, setLineasProducto] = useState([{ id_producto: "", cantidad: 1 }]);
  const [lineasDetalle, setLineasDetalle] = useState([]);
  const [loadingLineas, setLoadingLineas] = useState(false);

  // ── Carga de datos ────────────────────────────────────────────────────────
  const obtenerFiados = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/fiados/${buildQuery(params)}`);
      if (!res) return;
      const data = await res.json();
      setFiados(data.data || []);
    } catch {
      showAlert("Error", "No se pudieron cargar los fiados", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  const obtenerUsuarios = useCallback(async () => {
    try {
      const res = await apiFetch("/api/usuarios/");
      if (!res) return;
      const data = await res.json();
      setUsuarios(data.data || []);
    } catch {
      showAlert("Error", "No se pudieron cargar los usuarios", "error");
    }
  }, []);

  const obtenerProductos = useCallback(async () => {
    try {
      const res = await apiFetch("/api/productos/");
      if (!res) return;
      const data = await res.json();
      setProductos(data.data || []);
    } catch {
      showAlert("Error", "No se pudieron cargar los productos", "error");
    }
  }, []);

  const obtenerLineasFiado = async (idFiado) => {
    setLoadingLineas(true);
    try {
      const res = await apiFetch(`/api/productos_por_fiados/${buildQuery({ fiado: idFiado })}`);
      if (!res) return;
      const data = await res.json();
      setLineasDetalle(data.data || []);
    } catch {
      setLineasDetalle([]);
    } finally {
      setLoadingLineas(false);
    }
  };

  useEffect(() => {
    if (state?.filtroCliente) obtenerFiados({ cliente: state.filtroCliente });
    else obtenerFiados();
    obtenerUsuarios();
    obtenerProductos();
  }, [obtenerFiados, obtenerUsuarios, obtenerProductos]);

  const getNombreUsuario = (id) => {
    const u = usuarios.find((u) => u.id_usuario === id);
    return u ? `${u.nombre_usu} ${u.primer_apellido_usu}` : id;
  };

  const getNombreProducto = (id) => {
    const p = productos.find((p) => p.id_producto === Number(id));
    return p ? p.nombre_producto : `#${id}`;
  };

  const getPrecioProducto = (id) => {
    const p = productos.find((p) => p.id_producto === Number(id));
    return p ? Number(p.precio_producto) : 0;
  };

  const valorCalculado = lineasProducto.reduce((acc, l) => !l.id_producto ? acc : acc + getPrecioProducto(l.id_producto) * (Number(l.cantidad) || 0), 0);

  // ── Búsqueda de clientes (compartida entre filtro y modal) ─────────────────
  const buscarClientes = useCallback(async (texto, setOpciones, setLoadingFn) => {
    if (texto.length < 3) { setOpciones([]); return; }
    setLoadingFn(true);
    try {
      const res = await apiFetch(`/api/usuarios/${buildQuery({ busqueda: texto })}`);
      if (!res) return;
      const data = await res.json();
      setOpciones((data.data || []).slice(0, 5).map((u) => ({ value: u.id_usuario, label: `${u.nombre_usu} ${u.primer_apellido_usu} (${u.id_usuario})` })));
    } catch {
      setOpciones([]);
    } finally {
      setLoadingFn(false);
    }
  }, []);

  const onClienteFiltroChange = (texto) => {
    setClienteFiltroLabel(texto);
    if (!texto) { setClienteFiltroId(""); setClienteFiltroOpciones([]); return; }
    clearTimeout(debounceFiltroRef.current);
    debounceFiltroRef.current = setTimeout(() => buscarClientes(texto, setClienteFiltroOpciones, setLoadingClienteFiltro), 300);
  };

  const onClienteModalChange = (texto) => {
    setClienteModalLabel(texto);
    setFiadoActual((prev) => ({ ...prev, id_usuario_fiado: "" }));
    if (!texto) { setClienteModalOpciones([]); return; }
    clearTimeout(debounceModalRef.current);
    debounceModalRef.current = setTimeout(() => buscarClientes(texto, setClienteModalOpciones, setLoadingClienteModal), 300);
  };

  // ── Filtros ───────────────────────────────────────────────────────────────
  const aplicarFiltros = () => obtenerFiados({ cliente: clienteFiltroId, fecha_desde: filtroFechaDesde, fecha_hasta: filtroFechaHasta });

  const limpiarFiltros = () => {
    setClienteFiltroId(""); setClienteFiltroLabel(""); setFiltroFechaDesde(""); setFiltroFechaHasta("");
    obtenerFiados();
  };

  // ── Modal ─────────────────────────────────────────────────────────────────
  const abrirCrear = () => {
    setModo("crear"); setFiadoActual(FIADO_VACIO); setLineasProducto([{ id_producto: "", cantidad: 1 }]); setLineasDetalle([]);
    setClienteModalLabel(""); setClienteModalOpciones([]);
    setIsModalOpen(true);
  };

  const abrirEditar = (f) => {
    setModo("editar"); setFiadoActual({ ...f }); setLineasDetalle([]); obtenerLineasFiado(f.id_fiado);
    setClienteModalLabel(getNombreUsuario(f.id_usuario_fiado) + ` (${f.id_usuario_fiado})`); setClienteModalOpciones([]);
    setIsModalOpen(true);
  };

  const abrirDetalle = (f) => { setModo("detalle"); setFiadoActual({ ...f }); setLineasDetalle([]); obtenerLineasFiado(f.id_fiado); setIsModalOpen(true); };

  const cerrarModal = () => { setIsModalOpen(false); setLineasDetalle([]); };

  // ── Líneas crear ──────────────────────────────────────────────────────────
  const agregarLinea = () => setLineasProducto((prev) => [...prev, { id_producto: "", cantidad: 1 }]);
  const eliminarLinea = (idx) => setLineasProducto((prev) => prev.filter((_, i) => i !== idx));
  const actualizarLinea = (idx, campo, valor) => setLineasProducto((prev) => prev.map((l, i) => i === idx ? { ...l, [campo]: valor } : l));

  // ── CRUD fiado ────────────────────────────────────────────────────────────
  const crearFiado = async () => {
    const lineasValidas = lineasProducto.filter((l) => l.id_producto && Number(l.cantidad) > 0);
    if (!fiadoActual.id_usuario_fiado) return showAlert("Validación", "Selecciona un cliente", "warning");
    if (lineasValidas.length === 0) return showAlert("Validación", "Agrega al menos un producto", "warning");
    if (!fiadoActual.descripcion_fiado.trim()) return showAlert("Validación", "La descripción es obligatoria", "warning");

    showLoading("Registrando fiado...");
    try {
      const resFiado = await apiFetch("/api/fiados/", { method: "POST", body: JSON.stringify({ id_usuario_fiado: fiadoActual.id_usuario_fiado, fecha_fiado: fiadoActual.fecha_fiado, valor_fiado: valorCalculado.toFixed(2), descripcion_fiado: fiadoActual.descripcion_fiado }) });
      const dataFiado = await resFiado.json();
      if (!resFiado.ok) throw new Error(dataFiado.message || "Error al crear el fiado");

      const idFiadoCreado = dataFiado.data?.id_fiado;
      if (!idFiadoCreado) throw new Error("El servidor no devolvió el ID del fiado creado");

      const erroresLineas = [];
      for (const linea of lineasValidas) {
        const resLinea = await apiFetch("/api/productos_por_fiados/", { method: "POST", body: JSON.stringify({ id_fiado: idFiadoCreado, id_producto: Number(linea.id_producto), cantidad: Number(linea.cantidad) }) });
        if (!resLinea.ok) { const dataLinea = await resLinea.json(); erroresLineas.push(dataLinea.message || `Error en producto #${linea.id_producto}`); }
      }

      closeLoading(); cerrarModal(); obtenerFiados();
      if (erroresLineas.length > 0) showAlert("Fiado creado con advertencias", `El fiado se registró pero algunos productos fallaron: ${erroresLineas.join(", ")}`, "warning");
      else showAlert("Fiado registrado", "Fiado y productos guardados correctamente", "success");
    } catch (err) { closeLoading(); showAlert("Error", err.message, "error"); }
  };

  const actualizarFiado = async () => {
    if (!fiadoActual.descripcion_fiado.trim()) return showAlert("Validación", "La descripción es obligatoria", "warning");
    if (!fiadoActual.valor_fiado || Number(fiadoActual.valor_fiado) <= 0) return showAlert("Validación", "El valor debe ser mayor a 0", "warning");
    showLoading("Actualizando...");
    try {
      const res = await apiFetch(`/api/fiados/${fiadoActual.id_fiado}/`, { method: "PUT", body: JSON.stringify({ id_usuario_fiado: fiadoActual.id_usuario_fiado, fecha_fiado: fiadoActual.fecha_fiado, valor_fiado: Number(fiadoActual.valor_fiado).toFixed(2), descripcion_fiado: fiadoActual.descripcion_fiado }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error al actualizar");
      closeLoading(); cerrarModal(); obtenerFiados();
      showAlert("Actualizado", data.message || "Fiado actualizado correctamente", "success");
    } catch (err) { closeLoading(); showAlert("Error", err.message, "error"); }
  };

  const eliminarFiado = async (id) => {
    const confirm = await showAlert("¿Eliminar fiado?", "Esta acción no se puede deshacer", "warning");
    if (!confirm.isConfirmed) return;
    showLoading("Eliminando...");
    try {
      const res = await apiFetch(`/api/fiados/${id}/`, { method: "DELETE" });
      closeLoading();
      if (!res.ok) throw new Error("Error al eliminar el fiado");
      obtenerFiados();
      showAlert("Eliminado", "Fiado eliminado correctamente", "success");
    } catch (err) { closeLoading(); showAlert("Error", err.message, "error"); }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Fiados</h1>
        <button onClick={abrirCrear} className="bg-[#557b5a] hover:bg-[#3f5e44] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">+ Nuevo fiado</button>
      </div>
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Cliente</label>
            <AutocompleteInput placeholder="Escribe 3+ letras: nombre, apellido o CC..." value={clienteFiltroLabel} onChange={onClienteFiltroChange} onSelect={(opt) => { setClienteFiltroLabel(opt.label); setClienteFiltroId(String(opt.value)); setClienteFiltroOpciones([]); }} options={clienteFiltroOpciones} loading={loadingClienteFiltro}/>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Desde</label>
            <input type="date" value={filtroFechaDesde} onChange={(e) => setFiltroFechaDesde(e.target.value)} className={inputClass}/>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Hasta</label>
            <input type="date" value={filtroFechaHasta} onChange={(e) => setFiltroFechaHasta(e.target.value)} className={inputClass}/>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={limpiarFiltros} className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 underline">Limpiar</button>
          <button onClick={aplicarFiltros} className="px-4 py-1.5 bg-[#557b5a] hover:bg-[#3f5e44] text-white text-sm rounded-lg transition-colors">Filtrar</button>
        </div>
      </div>
      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando fiados...</div>
      ) : fiados.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No hay fiados registrados</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Valor</th>
                <th className="px-4 py-3 font-medium">Descripción</th>
                <th className="px-4 py-3 font-medium text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {fiados.map((f) => (
                <tr key={f.id_fiado} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-500">#{f.id_fiado}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{getNombreUsuario(f.id_usuario_fiado)}<span className="block text-xs text-gray-400">{f.id_usuario_fiado}</span></td>
                  <td className="px-4 py-3 text-gray-600">{f.fecha_fiado}</td>
                  <td className="px-4 py-3 font-semibold text-[#557b5a]">{formatCOP(f.valor_fiado)}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{f.descripcion_fiado}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-3">
                      <button onClick={() => abrirDetalle(f)} className="text-gray-500 hover:text-gray-800 text-xs underline">Ver</button>
                      <button onClick={() => abrirEditar(f)} className="text-blue-600 hover:text-blue-800 text-xs underline">Editar</button>
                      <button onClick={() => eliminarFiado(f.id_fiado)} className="text-red-500 hover:text-red-700 text-xs underline">Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {fiados.length > 0 && (
        <div className="mt-4 flex justify-end">
          <span className="text-sm text-gray-500">Total: <span className="font-semibold text-[#557b5a]">{formatCOP(fiados.reduce((acc, f) => acc + Number(f.valor_fiado), 0))}</span>{" · "}{fiados.length} fiado{fiados.length !== 1 ? "s" : ""}</span>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">
                {modo === "crear" && "Registrar fiado"}
                {modo === "editar" && `Editar fiado #${fiadoActual.id_fiado}`}
                {modo === "detalle" && `Detalle fiado #${fiadoActual.id_fiado}`}
              </h2>
              <button onClick={cerrarModal} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente {modo !== "detalle" && <span className="text-red-500">*</span>}</label>
                {modo === "detalle" ? (
                  <p className="text-gray-800">{getNombreUsuario(fiadoActual.id_usuario_fiado)} <span className="text-gray-400 text-sm">({fiadoActual.id_usuario_fiado})</span></p>
                ) : (
                  <AutocompleteInput placeholder="Escribe 3+ letras: nombre, apellido o CC..." value={clienteModalLabel} onChange={onClienteModalChange} onSelect={(opt) => { setClienteModalLabel(opt.label); setFiadoActual((prev) => ({ ...prev, id_usuario_fiado: opt.value })); setClienteModalOpciones([]); }} options={clienteModalOpciones} loading={loadingClienteModal}/>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha {modo !== "detalle" && <span className="text-red-500">*</span>}</label>
                {modo === "detalle" ? <p className="text-gray-800">{fiadoActual.fecha_fiado}</p> : <input type="date" value={fiadoActual.fecha_fiado} onChange={(e) => setFiadoActual({ ...fiadoActual, fecha_fiado: e.target.value })} className={inputClass}/>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción {modo !== "detalle" && <span className="text-red-500">*</span>}</label>
                {modo === "detalle" ? <p className="text-gray-800">{fiadoActual.descripcion_fiado}</p> : <input type="text" maxLength={100} placeholder="Ej: Almuerzo familiar viernes" value={fiadoActual.descripcion_fiado} onChange={(e) => setFiadoActual({ ...fiadoActual, descripcion_fiado: e.target.value })} className={inputClass}/>}
              </div>
              {modo === "crear" && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">Productos <span className="text-red-500">*</span></label>
                    <button onClick={agregarLinea} className="text-xs text-[#557b5a] hover:underline font-medium">+ Agregar producto</button>
                  </div>
                  <div className="space-y-2">
                    {lineasProducto.map((linea, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <select value={linea.id_producto} onChange={(e) => actualizarLinea(idx, "id_producto", e.target.value)} className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#A3C9A8]">
                          <option value="">— Producto —</option>
                          {productos.map((p) => <option key={p.id_producto} value={p.id_producto}>{p.nombre_producto} — {formatCOP(p.precio_producto)}</option>)}
                        </select>
                        <input type="number" min={1} value={linea.cantidad} onChange={(e) => actualizarLinea(idx, "cantidad", e.target.value)} className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#A3C9A8]"/>
                        <span className="text-sm text-gray-500 min-w-[90px] text-right">{linea.id_producto ? formatCOP(getPrecioProducto(linea.id_producto) * (Number(linea.cantidad) || 0)) : "—"}</span>
                        {lineasProducto.length > 1 && <button onClick={() => eliminarLinea(idx)} className="text-red-400 hover:text-red-600 text-lg leading-none px-1">×</button>}
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex justify-end"><span className="text-sm text-gray-500">Total: <span className="font-bold text-[#557b5a] text-base">{formatCOP(valorCalculado)}</span></span></div>
                </div>
              )}
              {modo === "editar" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor (COP) <span className="text-red-500">*</span></label>
                  <input type="number" min={0} step="0.01" value={fiadoActual.valor_fiado} onChange={(e) => setFiadoActual({ ...fiadoActual, valor_fiado: e.target.value })} className={inputClass}/>
                </div>
              )}
              {modo === "detalle" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Valor total</label>
                    <p className="text-[#557b5a] font-bold text-lg">{formatCOP(fiadoActual.valor_fiado)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Productos del fiado</label>
                    {loadingLineas ? <p className="text-sm text-gray-400">Cargando productos...</p>
                    : lineasDetalle.length === 0 ? <p className="text-sm text-gray-400 italic">Sin productos registrados</p>
                    : (
                      <div className="rounded-xl border border-gray-200 overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 text-gray-600 text-left">
                            <tr><th className="px-3 py-2 font-medium">Producto</th><th className="px-3 py-2 font-medium text-center">Cant.</th><th className="px-3 py-2 font-medium text-right">Subtotal</th></tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {lineasDetalle.map((l) => (
                              <tr key={l.id_producto} className="hover:bg-gray-50">
                                <td className="px-3 py-2 text-gray-800">{getNombreProducto(l.id_producto)}</td>
                                <td className="px-3 py-2 text-center text-gray-600">{l.cantidad}</td>
                                <td className="px-3 py-2 text-right font-medium text-[#557b5a]">{formatCOP(getPrecioProducto(l.id_producto) * l.cantidad)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}
              {modo === "editar" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Productos registrados</label>
                  {loadingLineas ? <p className="text-sm text-gray-400">Cargando productos...</p>
                  : lineasDetalle.length === 0 ? <p className="text-sm text-gray-400 italic">Sin productos registrados</p>
                  : (
                    <div className="rounded-xl border border-gray-200 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-600 text-left">
                          <tr><th className="px-3 py-2 font-medium">Producto</th><th className="px-3 py-2 font-medium text-center">Cant.</th><th className="px-3 py-2 font-medium text-right">Subtotal</th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {lineasDetalle.map((l) => (
                            <tr key={l.id_producto} className="hover:bg-gray-50">
                              <td className="px-3 py-2 text-gray-800">{getNombreProducto(l.id_producto)}</td>
                              <td className="px-3 py-2 text-center text-gray-600">{l.cantidad}</td>
                              <td className="px-3 py-2 text-right font-medium text-[#557b5a]">{formatCOP(getPrecioProducto(l.id_producto) * l.cantidad)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-2">* Para modificar los productos de un fiado, elimínalo y créalo de nuevo.</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={cerrarModal} className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm">{modo === "detalle" ? "Cerrar" : "Cancelar"}</button>
              {modo !== "detalle" && <button onClick={modo === "crear" ? crearFiado : actualizarFiado} className="px-4 py-2 rounded-lg bg-[#557b5a] hover:bg-[#3f5e44] text-white text-sm font-medium">{modo === "crear" ? "Registrar fiado" : "Guardar cambios"}</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}