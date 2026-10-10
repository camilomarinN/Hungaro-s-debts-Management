import { useEffect, useState, useCallback, useRef } from "react";
import { apiFetch } from "../services/api";
import { showAlert, showLoading, closeLoading } from "../utils/alerts";

const USUARIO_VACIO = { id_usuario: "", nombre_usu: "", primer_apellido_usu: "", segundo_apellido_usu: "", hash_contrasena_usu: "", fecha_ingreso_usu: new Date().toISOString().split("T")[0], id_rol: "" };
const inputClass = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#A3C9A8]";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";
const formatCOP = (valor) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(valor || 0);
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
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
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

function FiltrosAccordion({ children, count }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-200 rounded-xl mb-6 overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700">
        <span className="flex items-center gap-2">
          <span>Filtros</span>
          {count > 0 && <span className="bg-[#557b5a] text-white text-xs px-2 py-0.5 rounded-full">{count} activo{count !== 1 ? "s" : ""}</span>}
        </span>
        <span className={`text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}>▼</span>
      </button>
      {open && <div className="p-4 border-t border-gray-100">{children}</div>}
    </div>
  );
}

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(false);

  const [filtroNombre, setFiltroNombre] = useState("");
  const [filtroApellido, setFiltroApellido] = useState("");
  const [filtroRolLabel, setFiltroRolLabel] = useState("");
  const [filtroRolId, setFiltroRolId] = useState("");
  const [filtroFechaDesde, setFiltroFechaDesde] = useState("");
  const [filtroFechaHasta, setFiltroFechaHasta] = useState("");
  const [rolOpciones, setRolOpciones] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const debounceRef = useRef(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modo, setModo] = useState("crear");
  const [usuarioActual, setUsuarioActual] = useState(USUARIO_VACIO);
  const [cambiarPassword, setCambiarPassword] = useState(false);
  const [rolModalLabel, setRolModalLabel] = useState("");
  const [rolModalOpciones, setRolModalOpciones] = useState([]);
  const [loadingRolModal, setLoadingRolModal] = useState(false);
  const debounceModalRef = useRef(null);

  const [deudaAcumulada, setDeudaAcumulada] = useState(null);
  const [loadingDeuda, setLoadingDeuda] = useState(false);

  const obtenerUsuarios = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/usuarios/${buildQuery(params)}`);
      if (!res) return;
      const data = await res.json();
      setUsuarios(data.data || []);
    } catch {
      showAlert("Error", "No se pudieron cargar los usuarios", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { obtenerUsuarios(); }, [obtenerUsuarios]);

  const buscarRoles = useCallback(async (texto, setOpciones, setLoadingFn) => {
    if (texto.length < 3) { setOpciones([]); return; }
    setLoadingFn(true);
    try {
      const res = await apiFetch(`/api/roles/${buildQuery({ nombre_rol: texto })}`);
      if (!res) return;
      const data = await res.json();
      setOpciones((data.data || []).map((r) => ({ value: r.id_rol, label: r.nombre_rol })));
    } catch {
      setOpciones([]);
    } finally {
      setLoadingFn(false);
    }
  }, []);

  const onFiltroRolChange = (texto) => {
    setFiltroRolLabel(texto);
    if (!texto) { setFiltroRolId(""); setRolOpciones([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => buscarRoles(texto, setRolOpciones, setLoadingRoles), 300);
  };

  const onRolModalChange = (texto) => {
    setRolModalLabel(texto);
    setUsuarioActual((prev) => ({ ...prev, id_rol: "" }));
    if (!texto) { setRolModalOpciones([]); return; }
    clearTimeout(debounceModalRef.current);
    debounceModalRef.current = setTimeout(() => buscarRoles(texto, setRolModalOpciones, setLoadingRolModal), 300);
  };

  const obtenerDeudaUsuario = async (idUsuario) => {
    setLoadingDeuda(true); setDeudaAcumulada(null);
    try {
      const res = await apiFetch(`/api/fiados/${buildQuery({ cliente: idUsuario })}`);
      if (!res) return;
      const data = await res.json();
      const fiados = data.data || [];
      const total = fiados.reduce((acc, f) => acc + Number(f.valor_fiado), 0);
      setDeudaAcumulada({ total, cantidad: fiados.length, ultimos: fiados.slice(0, 5) });
    } catch {
      setDeudaAcumulada(null);
    } finally {
      setLoadingDeuda(false);
    }
  };

  const filtrosActivos = [filtroNombre, filtroApellido, filtroRolId, filtroFechaDesde, filtroFechaHasta].filter(Boolean).length;
  const aplicarFiltros = () => obtenerUsuarios({ nombre: filtroNombre, apellido: filtroApellido, rol: filtroRolId, fecha_ingreso_desde: filtroFechaDesde, fecha_ingreso_hasta: filtroFechaHasta });
  const limpiarFiltros = () => { setFiltroNombre(""); setFiltroApellido(""); setFiltroRolLabel(""); setFiltroRolId(""); setFiltroFechaDesde(""); setFiltroFechaHasta(""); obtenerUsuarios(); };

  const abrirCrear = () => { setModo("crear"); setUsuarioActual(USUARIO_VACIO); setCambiarPassword(false); setRolModalLabel(""); setRolModalOpciones([]); setIsModalOpen(true); };
  const abrirEditar = (u) => { setModo("editar"); setUsuarioActual({ ...u, hash_contrasena_usu: "" }); setCambiarPassword(false); setRolModalLabel(u.id_rol?.nombre_rol || ""); setRolModalOpciones([]); setIsModalOpen(true); };
  const abrirDetalle = (u) => { setModo("detalle"); setUsuarioActual({ ...u }); setDeudaAcumulada(null); obtenerDeudaUsuario(u.id_usuario); setIsModalOpen(true); };
  const cerrarModal = () => { setIsModalOpen(false); setDeudaAcumulada(null); };

  const set = (campo) => (e) => setUsuarioActual((prev) => ({ ...prev, [campo]: e.target.value }));

  const validar = () => {
    if (!usuarioActual.id_usuario.trim()) { showAlert("Validación", "El ID de usuario es obligatorio", "warning"); return false; }
    if (!usuarioActual.nombre_usu.trim()) { showAlert("Validación", "El nombre es obligatorio", "warning"); return false; }
    if (!usuarioActual.primer_apellido_usu.trim()) { showAlert("Validación", "El primer apellido es obligatorio", "warning"); return false; }
    if (!usuarioActual.id_rol) { showAlert("Validación", "Selecciona un rol", "warning"); return false; }
    if (modo === "crear" && !usuarioActual.hash_contrasena_usu.trim()) { showAlert("Validación", "La contraseña es obligatoria al crear", "warning"); return false; }
    if (modo === "editar" && cambiarPassword && !usuarioActual.hash_contrasena_usu.trim()) { showAlert("Validación", "Ingresa la nueva contraseña", "warning"); return false; }
    return true;
  };

  const crearUsuario = async () => {
    if (!validar()) return;
    showLoading("Creando usuario...");
    try {
      const body = { id_usuario: usuarioActual.id_usuario, nombre_usu: usuarioActual.nombre_usu, primer_apellido_usu: usuarioActual.primer_apellido_usu, segundo_apellido_usu: usuarioActual.segundo_apellido_usu || null, hash_contrasena_usu: usuarioActual.hash_contrasena_usu, fecha_ingreso_usu: usuarioActual.fecha_ingreso_usu, id_rol_id: Number(usuarioActual.id_rol) };
      const res = await apiFetch("/api/usuarios/", { method: "POST", body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error al crear usuario");
      closeLoading(); cerrarModal(); obtenerUsuarios();
      showAlert("Éxito", "Usuario creado correctamente", "success");
    } catch (err) { closeLoading(); showAlert("Error", err.message, "error"); }
  };

  const actualizarUsuario = async () => {
    if (!validar()) return;
    showLoading("Actualizando usuario...");
    try {
      const body = { nombre_usu: usuarioActual.nombre_usu, primer_apellido_usu: usuarioActual.primer_apellido_usu, segundo_apellido_usu: usuarioActual.segundo_apellido_usu || null, fecha_ingreso_usu: usuarioActual.fecha_ingreso_usu, id_rol_id: Number(usuarioActual.id_rol) };
      if (cambiarPassword && usuarioActual.hash_contrasena_usu) body.hash_contrasena_usu = usuarioActual.hash_contrasena_usu;
      const res = await apiFetch(`/api/usuarios/${usuarioActual.id_usuario}/`, { method: "PUT", body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error al actualizar usuario");
      closeLoading(); cerrarModal(); obtenerUsuarios();
      showAlert("Éxito", "Usuario actualizado correctamente", "success");
    } catch (err) { closeLoading(); showAlert("Error", err.message, "error"); }
  };

  const eliminarUsuario = async (id) => {
    const confirm = await showAlert("¿Eliminar usuario?", "Esta acción eliminará también sus fiados asociados", "warning");
    if (!confirm.isConfirmed) return;
    showLoading("Eliminando...");
    try {
      const res = await apiFetch(`/api/usuarios/${id}/`, { method: "DELETE" });
      closeLoading();
      if (!res.ok) throw new Error("Error al eliminar el usuario");
      obtenerUsuarios();
      showAlert("Eliminado", "Usuario eliminado correctamente", "success");
    } catch (err) { closeLoading(); showAlert("Error", err.message, "error"); }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Usuarios</h1>
        <button onClick={abrirCrear} className="bg-[#557b5a] hover:bg-[#3f5e44] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">+ Nuevo usuario</button>
      </div>

      <FiltrosAccordion count={filtrosActivos}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
          <div>
            <label className={labelClass}>Nombre</label>
            <input type="text" placeholder="Buscar por nombre" value={filtroNombre} onChange={(e) => setFiltroNombre(e.target.value)} className={inputClass}/>
          </div>
          <div>
            <label className={labelClass}>Apellido</label>
            <input type="text" placeholder="Buscar por apellido" value={filtroApellido} onChange={(e) => setFiltroApellido(e.target.value)} className={inputClass}/>
          </div>
          <div>
            <label className={labelClass}>Rol</label>
            <AutocompleteInput placeholder="Escribe 3+ letras..." value={filtroRolLabel} onChange={onFiltroRolChange} onSelect={(opt) => { setFiltroRolLabel(opt.label); setFiltroRolId(String(opt.value)); setRolOpciones([]); }} options={rolOpciones} loading={loadingRoles}/>
          </div>
          <div>
            <label className={labelClass}>Ingreso desde</label>
            <input type="date" value={filtroFechaDesde} onChange={(e) => setFiltroFechaDesde(e.target.value)} className={inputClass}/>
          </div>
          <div>
            <label className={labelClass}>Ingreso hasta</label>
            <input type="date" value={filtroFechaHasta} onChange={(e) => setFiltroFechaHasta(e.target.value)} className={inputClass}/>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={limpiarFiltros} className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 underline">Limpiar</button>
          <button onClick={aplicarFiltros} className="px-4 py-1.5 bg-[#557b5a] hover:bg-[#3f5e44] text-white text-sm rounded-lg transition-colors">Filtrar</button>
        </div>
      </FiltrosAccordion>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando usuarios...</div>
      ) : usuarios.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No hay usuarios registrados</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Rol</th>
                <th className="px-4 py-3 font-medium">Ingreso</th>
                <th className="px-4 py-3 font-medium text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {usuarios.map((u) => (
                <tr key={u.id_usuario} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{u.id_usuario}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {u.nombre_usu} {u.primer_apellido_usu}
                    {u.segundo_apellido_usu && <span className="text-gray-500"> {u.segundo_apellido_usu}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="bg-[#e8f0e9] text-[#3f5e44] text-xs font-medium px-2.5 py-1 rounded-full">{u.id_rol?.nombre_rol || u.id_rol}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{u.fecha_ingreso_usu}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-3">
                      <button onClick={() => abrirDetalle(u)} className="text-gray-500 hover:text-gray-800 text-xs underline">Ver</button>
                      <button onClick={() => abrirEditar(u)} className="text-blue-600 hover:text-blue-800 text-xs underline">Editar</button>
                      <button onClick={() => eliminarUsuario(u.id_usuario)} className="text-red-500 hover:text-red-700 text-xs underline">Eliminar</button>
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">
                {modo === "crear" && "Nuevo usuario"}
                {modo === "editar" && `Editar — ${usuarioActual.id_usuario}`}
                {modo === "detalle" && `Detalle — ${usuarioActual.id_usuario}`}
              </h2>
              <button onClick={cerrarModal} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
            </div>

            <div className="px-6 py-5 space-y-4">

              {/* ID — solo crear */}
              {modo === "crear" && (
                <div>
                  <label className={labelClass}>ID usuario <span className="text-red-500">*</span></label>
                  <input type="text" maxLength={20} placeholder="Ej: CC1023456789" value={usuarioActual.id_usuario} onChange={set("id_usuario")} className={inputClass}/>
                </div>
              )}

              {/* Nombre */}
              <div>
                <label className={labelClass}>Nombre {modo !== "detalle" && <span className="text-red-500">*</span>}</label>
                {modo === "detalle" ? <p className="text-gray-800">{usuarioActual.nombre_usu}</p> : <input type="text" maxLength={50} placeholder="Nombre" value={usuarioActual.nombre_usu} onChange={set("nombre_usu")} className={inputClass}/>}
              </div>

              {/* Primer apellido */}
              <div>
                <label className={labelClass}>Primer apellido {modo !== "detalle" && <span className="text-red-500">*</span>}</label>
                {modo === "detalle" ? <p className="text-gray-800">{usuarioActual.primer_apellido_usu}</p> : <input type="text" maxLength={50} placeholder="Primer apellido" value={usuarioActual.primer_apellido_usu} onChange={set("primer_apellido_usu")} className={inputClass}/>}
              </div>

              {/* Segundo apellido */}
              <div>
                <label className={labelClass}>Segundo apellido</label>
                {modo === "detalle" ? <p className="text-gray-800">{usuarioActual.segundo_apellido_usu || <span className="text-gray-400 italic">—</span>}</p> : <input type="text" maxLength={50} placeholder="Segundo apellido (opcional)" value={usuarioActual.segundo_apellido_usu || ""} onChange={set("segundo_apellido_usu")} className={inputClass}/>}
              </div>

              {/* Rol */}
              <div>
                <label className={labelClass}>Rol {modo !== "detalle" && <span className="text-red-500">*</span>}</label>
                {modo === "detalle" ? (
                  <span className="bg-[#e8f0e9] text-[#3f5e44] text-xs font-medium px-2.5 py-1 rounded-full">{usuarioActual.id_rol?.nombre_rol || usuarioActual.id_rol}</span>
                ) : (
                  <AutocompleteInput placeholder="Escribe 3+ letras para buscar rol..." value={rolModalLabel} onChange={onRolModalChange} onSelect={(opt) => { setRolModalLabel(opt.label); setUsuarioActual((prev) => ({ ...prev, id_rol: opt.value })); setRolModalOpciones([]); }} options={rolModalOpciones} loading={loadingRolModal}/>
                )}
              </div>

              {/* Fecha ingreso */}
              <div>
                <label className={labelClass}>Fecha de ingreso {modo !== "detalle" && <span className="text-red-500">*</span>}</label>
                {modo === "detalle" ? <p className="text-gray-800">{usuarioActual.fecha_ingreso_usu}</p> : <input type="date" value={usuarioActual.fecha_ingreso_usu} onChange={set("fecha_ingreso_usu")} className={inputClass}/>}
              </div>

              {/* Contraseña — crear */}
              {modo === "crear" && (
                <div>
                  <label className={labelClass}>Contraseña <span className="text-red-500">*</span></label>
                  <input type="password" placeholder="Contraseña" value={usuarioActual.hash_contrasena_usu} onChange={set("hash_contrasena_usu")} className={inputClass}/>
                </div>
              )}

              {/* Contraseña — editar con toggle */}
              {modo === "editar" && (
                <div>
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none mb-2">
                    <input type="checkbox" checked={cambiarPassword} onChange={(e) => setCambiarPassword(e.target.checked)} className="accent-[#557b5a]"/>
                    Cambiar contraseña
                  </label>
                  {cambiarPassword && <input type="password" placeholder="Nueva contraseña" value={usuarioActual.hash_contrasena_usu} onChange={set("hash_contrasena_usu")} className={inputClass}/>}
                </div>
              )}

              {/* Deuda acumulada — solo detalle */}
              {modo === "detalle" && (
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Resumen de fiados</p>
                  {loadingDeuda ? (
                    <p className="text-sm text-gray-400">Calculando deuda...</p>
                  ) : !deudaAcumulada ? (
                    <p className="text-sm text-gray-400 italic">No se pudo cargar la información</p>
                  ) : deudaAcumulada.cantidad === 0 ? (
                    <p className="text-sm text-gray-400 italic">Sin fiados registrados</p>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-[#e8f0e9] rounded-xl p-3 text-center">
                          <p className="text-xs text-[#3f5e44] mb-1">Deuda acumulada</p>
                          <p className="text-lg font-bold text-[#557b5a]">{formatCOP(deudaAcumulada.total)}</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3 text-center">
                          <p className="text-xs text-gray-500 mb-1">Total fiados</p>
                          <p className="text-lg font-bold text-gray-700">{deudaAcumulada.cantidad}</p>
                        </div>
                      </div>
                      {deudaAcumulada.ultimos.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-500 mb-2">Últimos fiados</p>
                          <div className="space-y-1">
                            {deudaAcumulada.ultimos.map((f) => (
                              <div key={f.id_fiado} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                                <span className="text-gray-600 shrink-0">{f.fecha_fiado}</span>
                                <span className="text-gray-500 truncate mx-2">{f.descripcion_fiado}</span>
                                <span className="font-medium text-[#557b5a] shrink-0">{formatCOP(f.valor_fiado)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={cerrarModal} className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm">{modo === "detalle" ? "Cerrar" : "Cancelar"}</button>
              {modo !== "detalle" && (
                <button onClick={modo === "crear" ? crearUsuario : actualizarUsuario} className="px-4 py-2 rounded-lg bg-[#557b5a] hover:bg-[#3f5e44] text-white text-sm font-medium">
                  {modo === "crear" ? "Crear usuario" : "Guardar cambios"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}