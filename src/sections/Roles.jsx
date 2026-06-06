import { useEffect, useState } from "react";
import { apiFetch } from "../services/api";
import { showAlert } from "../utils/alerts";

export default function Roles() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modo, setModo] = useState("crear");

  const [rolActual, setRolActual] = useState({
    id_rol: null,
    nombre_rol: "",
  });

  const obtenerRoles = async () => {
    setLoading(true);
    try {
      const response = await apiFetch("/api/roles/");
      if (!response) return;

      const data = await response.json();
      setRoles(data.data || []);
    } catch (error) {
      showAlert("Error", "No se pudieron cargar los roles", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    obtenerRoles();
  }, []);

  const abrirCrear = () => {
    setModo("crear");
    setRolActual({ id_rol: null, nombre_rol: "" });
    setIsModalOpen(true);
  };

  const abrirEditar = (rol) => {
    setModo("editar");
    setRolActual(rol);
    setIsModalOpen(true);
  };

  const cerrarModal = () => {
    setIsModalOpen(false);
  };

  const crearRol = async () => {
    try {
      const response = await apiFetch("/api/roles/", {
        method: "POST",
        body: JSON.stringify({
          nombre_rol: rolActual.nombre_rol,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Error al crear rol");
      }

      cerrarModal();
      obtenerRoles();
      showAlert("Éxito", "Rol creado correctamente", "success");
    } catch (error) {
      showAlert("Error", error.message, "error");
    }
  };

  const actualizarRol = async () => {
    try {
      const response = await apiFetch(`/api/roles/${rolActual.id_rol}/`, {
        method: "PUT",
        body: JSON.stringify({
          nombre_rol: rolActual.nombre_rol,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Error al actualizar rol");
      }

      cerrarModal();
      obtenerRoles();
      showAlert("Éxito", "Rol actualizado correctamente", "success");
    } catch (error) {
      showAlert("Error", error.message, "error");
    }
  };

  const eliminarRol = async (id) => {
    const confirm = await showAlert(
      "¿Eliminar?",
      "Esta acción no se puede deshacer",
      "warning"
    );

    if (!confirm.isConfirmed) return;

    try {
      const response = await apiFetch(`/api/roles/${id}/`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Error al eliminar");
      }

      obtenerRoles();
      showAlert("Eliminado", "Rol eliminado correctamente", "success");
    } catch (error) {
      showAlert("Error", error.message, "error");
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Roles</h1>

      <button
        onClick={abrirCrear}
        className="mb-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
      >
        + Nuevo Rol
      </button>

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <table className="w-full border rounded">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border">ID</th>
              <th className="p-2 border">Nombre</th>
              <th className="p-2 border">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((rol) => (
              <tr key={rol.id_rol}>
                <td className="p-2 border">{rol.id_rol}</td>
                <td className="p-2 border">{rol.nombre_rol}</td>
                <td className="p-2 border flex gap-2">
                  <button
                    onClick={() => abrirEditar(rol)}
                    className="text-blue-600 hover:underline"
                  >
                    Editar
                  </button>

                  <button
                    onClick={() => eliminarRol(rol.id_rol)}
                    className="text-red-600 hover:underline"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg w-96 p-6">

            <h2 className="text-xl font-bold mb-4">
              {modo === "crear" ? "Crear Rol" : "Editar Rol"}
            </h2>

            <input
              type="text"
              value={rolActual.nombre_rol}
              onChange={(e) =>
                setRolActual({
                  ...rolActual,
                  nombre_rol: e.target.value,
                })
              }
              className="w-full border p-2 rounded mb-4"
              placeholder="Nombre del rol"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={cerrarModal}
                className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400"
              >
                Cancelar
              </button>

              <button
                onClick={modo === "crear" ? crearRol : actualizarRol}
                className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700"
              >
                {modo === "crear" ? "Crear" : "Guardar"}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}