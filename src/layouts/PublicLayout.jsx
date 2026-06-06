import Header from "../components/Header";
import Footer from "../components/Footer";

export default function PublicLayout({ children }) {
  return (
    <>
      <Header />
      <main className="min-h-screen p-6">
        {children}
      </main>
      <Footer />
    </>
  );
}
