import { useState } from 'react'
import './App.css'
import './styles/tailwindConfigs.css';

function App() {
  const [visible, setVisible] = useState(true);
  return (
    <>
      <h1>Hungaro's Debts Management</h1>
      <div className="card">
        <button onClick={() => setVisible(!visible)}>
          {visible ? "Ocultar" : "Mostrar"}
        </button>
        <p>
          {visible && <p>¡Hola! Soy un texto condicional 👋</p>}
        </p>
      </div>
    </>
  )
}

export default App
