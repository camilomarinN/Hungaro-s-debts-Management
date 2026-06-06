export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="mb-4">Página no encontrada</p>
      <a href="/catalogo" className="text-blue-500">
        Volver al catálogo
      </a>
    </div>
  );
}