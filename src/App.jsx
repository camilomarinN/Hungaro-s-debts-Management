import { useState } from 'react'
import './App.css'
import './styles/tailwindConfigs.css';
import Header from './components/Header';
export default function App() {
  const [visible, setVisible] = useState(true);
  return (
    <>
      <Header/>
    </>
  )
}