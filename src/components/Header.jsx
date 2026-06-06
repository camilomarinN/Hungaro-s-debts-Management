import { useState } from "react";
import {
  Dialog,
  DialogPanel,
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
  Popover,
  PopoverButton,
  PopoverGroup,
  PopoverPanel,
} from "@headlessui/react";
import {
  ClipboardDocumentListIcon,
  Bars3Icon,
  BanknotesIcon,
  XMarkIcon,
  UserGroupIcon,
  CubeIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { apiFetch } from "../services/api";
import Logo from "../assets/icons/hungaro_icon.png";
import "../styles/header.css";

const products = [
  { name: "Clientes", description: "gestion de empleados y clientes registrados", href: "/app/clientes", icon: UserGroupIcon },
  { name: "Productos", description: "gestion de productos registrados", href: "/app/productos", icon: CubeIcon },
  { name: "Deudas", description: "gestion de deudas de clientes", href: "/app/deudas", icon: BanknotesIcon },
  { name: "Roles", description: "Asignación de permisos y roles a empleados", href: "/app/roles", icon: ShieldCheckIcon },
  { name: "Auditorias", description: "historico de acciones en el sistema", href: "/app/auditorias", icon: ClipboardDocumentListIcon },
];

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await apiFetch("/api/logout/", { method: "POST" });
    } catch {}
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="bg-white border-2 border-white shadow-xl shadow-[#A3C9A8]">
      <nav className="mx-auto flex max-w-7xl items-center justify-between p-2 lg:px-8">
        <div className="flex lg:flex-1">
          <Link to="/catalogo" className="-m-1.5 p-1.5">
            <img src={Logo} className="h-20 w-auto header-options" />
          </Link>
        </div>

        <div className="flex lg:hidden">
          <button onClick={() => setMobileMenuOpen(true)} className="-m-2.5 p-2.5 text-gray-700">
            <Bars3Icon className="size-6" />
          </button>
        </div>

        <PopoverGroup className="hidden lg:flex lg:gap-x-12">
          {isAuthenticated && (
            <Popover className="relative">
              <PopoverButton className="header-options flex items-center gap-x-1 text-sm font-semibold text-gray-900">
                Administracion
                <ChevronDownIcon className="size-5 text-gray-400" />
              </PopoverButton>

              <PopoverPanel className="absolute left-1/2 z-10 mt-3 w-screen max-w-md -translate-x-1/2 rounded-3xl bg-white shadow-lg">
                <div className="p-4">
                  {products.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      className="group flex items-center gap-x-6 rounded-lg p-4 hover:bg-gray-50"
                    >
                      <div className="flex size-11 items-center justify-center rounded-lg bg-gray-50 group-hover:bg-white">
                        <item.icon className="size-6 text-gray-600 group-hover:text-indigo-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{item.name}</p>
                        <p className="text-sm text-gray-600">{item.description}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </PopoverPanel>
            </Popover>
          )}

          <Link to="/catalogo" className="header-options text-sm font-semibold text-gray-900">
            Catálogo
          </Link>
          <Link to="/sobre-nosotros" className="header-options text-sm font-semibold text-gray-900">
            Sobre nosotros
          </Link>
        </PopoverGroup>

        <div className="hidden lg:flex lg:flex-1 lg:justify-end">
          {isAuthenticated ? (
            <Popover className="relative">
              <PopoverButton className="header-options flex items-center gap-x-1 text-sm font-semibold text-gray-900">
                {user?.nombre || "Mi perfil"}
                <ChevronDownIcon className="size-5 text-gray-400" />
              </PopoverButton>

              <PopoverPanel className="absolute right-0 z-10 mt-3 w-48 rounded-xl bg-white shadow-lg ring-1 ring-gray-900/5">
                <div className="p-2">
                  <Link
                    to="/mi-perfil"
                    className="block rounded-lg px-4 py-2 text-sm text-gray-900 hover:bg-gray-100"
                  >
                    Mi perfil
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left rounded-lg px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    Cerrar sesión
                  </button>
                </div>
              </PopoverPanel>
            </Popover>
          ) : (
            <Link to="/login" className="header-options text-sm font-semibold text-gray-900">
              Log in →
            </Link>
          )}
        </div>
      </nav>

      <Dialog open={mobileMenuOpen} onClose={setMobileMenuOpen} className="lg:hidden">
        <div className="fixed inset-0 z-50" />
        <DialogPanel className="fixed inset-y-0 right-0 z-50 w-full bg-white p-6 sm:max-w-sm">
          <div className="flex items-center justify-between">
            <Link to="/catalogo">
              <img src={Logo} className="h-10 w-auto" />
            </Link>
            <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-gray-700">
              <XMarkIcon className="size-6" />
            </button>
          </div>

          <div className="mt-6">
            <div className="space-y-2">
              {isAuthenticated && (
                <Disclosure>
                  <DisclosureButton className="flex w-full justify-between py-2 text-base font-semibold text-gray-900">
                    Administración
                    <ChevronDownIcon className="size-5" />
                  </DisclosureButton>
                  <DisclosurePanel>
                    {products.map((item) => (
                      <Link
                        key={item.name}
                        to={item.href}
                        className="block py-2 pl-4 text-sm text-gray-700"
                      >
                        {item.name}
                      </Link>
                    ))}
                  </DisclosurePanel>
                </Disclosure>
              )}

              <Link to="/catalogo" className="block py-2 text-base font-semibold text-gray-900">
                Catálogo
              </Link>

              <Link to="/sobre-nosotros" className="block py-2 text-base font-semibold text-gray-900">
                Sobre nosotros
              </Link>

              {isAuthenticated ? (
                <>
                  <Link to="/mi-perfil" className="block py-2 text-base font-semibold text-gray-900">
                    Mi perfil
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left py-2 text-base font-semibold text-red-600"
                  >
                    Cerrar sesión
                  </button>
                </>
              ) : (
                <Link to="/login" className="block py-2 text-base font-semibold text-gray-900">
                  Log in
                </Link>
              )}
            </div>
          </div>
        </DialogPanel>
      </Dialog>
    </header>
  );
}