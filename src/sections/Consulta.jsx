import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../services/api";
import { showAlert } from "../utils/alerts";

const formatCOP = (valor) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(valor || 0);
const buildQuery = (params) => {
  const q = Object.entries(params).filter(([, v]) => v !== "").map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
  return q ? `?${q}` : "";
};

export default function Consulta() {
  const navigate = useNavigate();

  const [textoBusqueda, setTextoBusqueda] = useState("");
  const [sugerencias, setSugerencias] = useState([]);
  const [loadingSugerencias, setLoadingSugerencias] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const debounceRef = useRef(null);

  const [cliente, setCliente] = useState(null);
  const [fiados, setFiados] = useState([]);
  const [loadingResultado, setLoadingResultado] = useState(false);
  const [buscado, setBuscado] = useState(false);

  const onTextoCambio = (valor) => {
    setTextoBusqueda(valor);
    setDropdownOpen(true);
    clearTimeout(debounceRef.current);
    if (!valor.trim()) { setSugerencias([]); setBuscado(false); setCliente(null); setFiados([]); return; }
    if (valor.length < 3) { setSugerencias([]); return; }
    debounceRef.current = setTimeout(async () => {
      setLoadingSugerencias(true);
      try {
        const res = await apiFetch(`/api/usuarios/${buildQuery({ busqueda: valor })}`);
        if (!res) return;
        const data = await res.json();
        setSugerencias((data.data || []).slice(0, 8));
      } catch {
        setSugerencias([]);
      } finally {
        setLoadingSugerencias(false);
      }
    }, 300);
  };

  const seleccionarSugerencia = (usuario) => {
    setTextoBusqueda(`${usuario.nombre_usu} ${usuario.primer_apellido_usu} (${usuario.id_usuario})`);
    setSugerencias([]);
    setDropdownOpen(false);
    cargarPerfil(usuario);
  };

  const buscarManual = async () => {
    if (!textoBusqueda.trim()) return showAlert("Validación", "Ingresa un nombre o ID para buscar", "warning");
    const matchId = textoBusqueda.match(/\(([^)]+)\)$/);
    const termino = matchId ? matchId[1].trim() : textoBusqueda.trim();
    setLoadingResultado(true); setBuscado(true); setCliente(null); setFiados([]);
    try {
      // Intenta ID exacto primero
      const resId = await apiFetch(`/api/usuarios/${termino}/`);
      if (resId.ok) {
        const data = await resId.json();
        await cargarPerfil(data.data);
      } else {
        // busca por nombre/apellido combinados
        const resBusqueda = await apiFetch(`/api/usuarios/${buildQuery({ busqueda: termino })}`);
        const data = await resBusqueda.json();
        const resultados = data.data || [];
        if (resultados.length === 0) { setCliente(null); }
        else if (resultados.length === 1) { await cargarPerfil(resultados[0]); }
        else { setSugerencias(resultados); setDropdownOpen(true); setLoadingResultado(false); return; }
      }
    } catch {
      showAlert("Error", "No se pudo realizar la búsqueda", "error");
    } finally {
      setLoadingResultado(false);
    }
  };

  const cargarPerfil = async (usuario) => {
    setCliente(usuario);
    setBuscado(true);
    setLoadingResultado(true);
    try {
      const res = await apiFetch(`/api/fiados/${buildQuery({ cliente: usuario.id_usuario })}`);
      if (!res) return;
      const data = await res.json();
      setFiados(data.data || []);
    } catch {
      setFiados([]);
    } finally {
      setLoadingResultado(false);
    }
  };

  const irADeudas = () => {
    if (!cliente) return;
    navigate("/app/deudas", { state: { filtroCliente: cliente.id_usuario, filtroNombre: `${cliente.nombre_usu} ${cliente.primer_apellido_usu}` } });
  };

  const deudaTotal = fiados.reduce((acc, f) => acc + Number(f.valor_fiado), 0);
  const ultimosFiados = fiados.slice(0, 5);

  const mostrarLupa = !buscado && !loadingResultado;
  const mostrarCargando = loadingResultado;
  const mostrarSinResultados = buscado && !loadingResultado && !cliente;
  const mostrarPerfil = buscado && !loadingResultado && !!cliente;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Consulta de cliente</h1>
        <p className="text-sm text-gray-500">Busca un cliente por nombre o ID para ver su perfil y estado de cuenta</p>
      </div>
      <div className="flex gap-2 mb-8 relative">
        <div className="flex-1 relative">
          <input type="text" placeholder="Nombre del cliente o ID (ej CC: 123456789)" value={textoBusqueda} onChange={(e) => onTextoCambio(e.target.value)} onFocus={() => sugerencias.length > 0 && setDropdownOpen(true)} onBlur={() => setTimeout(() => setDropdownOpen(false), 150)} onKeyDown={(e) => e.key === "Enter" && buscarManual()} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#A3C9A8] shadow-sm"/>
          {dropdownOpen && textoBusqueda.length >= 3 && (
            <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
              {loadingSugerencias ? (
                <p className="px-4 py-3 text-sm text-gray-400">Buscando...</p>
              ) : sugerencias.length === 0 ? (
                <p className="px-4 py-3 text-sm text-gray-400">Sin resultados</p>
              ) : sugerencias.map((u) => (
                <button key={u.id_usuario} onMouseDown={(e) => { e.preventDefault(); seleccionarSugerencia(u); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
                  <span className="font-medium text-gray-800">{u.nombre_usu} {u.primer_apellido_usu}</span>
                  <span className="text-gray-400 text-xs ml-2">{u.id_usuario}</span>
                  <span className="text-[#557b5a] text-xs ml-2 bg-[#e8f0e9] px-1.5 py-0.5 rounded-full">{u.id_rol?.nombre_rol}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button onClick={buscarManual} className="bg-[#557b5a] hover:bg-[#3f5e44] text-white px-5 py-3 rounded-xl text-sm font-medium transition-colors shadow-sm">Buscar</button>
        {cliente && <button onClick={irADeudas} className="border border-[#557b5a] text-[#557b5a] hover:bg-[#557b5a] hover:text-white px-5 py-3 rounded-xl text-sm font-medium transition-colors shadow-sm">Ver fiados →</button>}
      </div>
      {mostrarLupa && (
        <div className="text-center py-20 text-gray-300">
          <p className="text-5xl mb-4">🔍</p>
          <p className="text-gray-400 text-sm">Busca un cliente para ver su perfil</p>
        </div>
      )}
      {mostrarCargando && <div className="text-center py-20 text-gray-400 text-sm">Cargando perfil...</div>}
      {mostrarSinResultados && <div className="text-center py-20 text-gray-400 text-sm">No se encontró ningún cliente con ese nombre o ID</div>}
      {mostrarPerfil && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="flex flex-col gap-5">
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Datos del cliente</p>
                <span className="bg-[#e8f0e9] text-[#3f5e44] text-xs font-medium px-2.5 py-1 rounded-full">{cliente.id_rol?.nombre_rol || cliente.id_rol}</span>
              </div>
              <p className="text-xl font-bold text-gray-800 mb-1">{cliente.nombre_usu} {cliente.primer_apellido_usu} {cliente.segundo_apellido_usu || ""}</p>
              <p className="text-sm text-gray-500 font-mono mb-4">{cliente.id_usuario}</p>
              <div className="border-t border-gray-100 pt-3">
                <p className="text-xs text-gray-400">Fecha de ingreso</p>
                <p className="text-sm text-gray-700 font-medium">{cliente.fecha_ingreso_usu}</p>
              </div>
            </div>
            <div className={`rounded-2xl p-5 shadow-sm border ${deudaTotal > 0 ? "bg-[#557b5a] border-[#3f5e44]" : "bg-gray-50 border-gray-200"}`}>
              <p className={`text-xs font-semibold uppercase tracking-wide mb-3 ${deudaTotal > 0 ? "text-[#c8e6c9]" : "text-gray-400"}`}>Deuda acumulada</p>
              <p className={`text-3xl font-bold mb-1 ${deudaTotal > 0 ? "text-white" : "text-gray-400"}`}>{formatCOP(deudaTotal)}</p>
              <p className={`text-sm ${deudaTotal > 0 ? "text-[#c8e6c9]" : "text-gray-400"}`}>{fiados.length === 0 ? "Sin fiados registrados" : `${fiados.length} fiado${fiados.length !== 1 ? "s" : ""} en total`}</p>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Últimos fiados</p>
              {fiados.length > 5 && <span className="text-xs text-gray-400">Mostrando 5 de {fiados.length}</span>}
            </div>
            {ultimosFiados.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-gray-300 text-sm">Sin fiados registrados</div>
            ) : (
              <div className="space-y-3">
                {ultimosFiados.map((f) => (
                  <div key={f.id_fiado} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                    <div className="min-w-0 flex-1 mr-3">
                      <p className="text-sm font-medium text-gray-800 truncate">{f.descripcion_fiado}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{f.fecha_fiado} · #{f.id_fiado}</p>
                    </div>
                    <p className="text-sm font-bold text-[#557b5a] shrink-0">{formatCOP(f.valor_fiado)}</p>
                  </div>
                ))}
              </div>
            )}
            {fiados.length > 0 && (
              <button onClick={irADeudas} className="mt-4 w-full text-center text-sm text-[#557b5a] hover:text-[#3f5e44] font-medium py-2 border border-[#A3C9A8] rounded-xl hover:bg-[#e8f0e9] transition-colors">Ver todos los fiados →</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}