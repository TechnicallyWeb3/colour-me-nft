import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './components/Home'
import './App.css'

function App() {
  return (
    <Router basename={import.meta.env.PROD ? '/colour-me-nft' : ''}>
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </Router>
  )
}

export default App