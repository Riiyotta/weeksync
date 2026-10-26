import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import PlaceholderPage from './components/PlaceholderPage.jsx'
import { placeholderPages } from './content.js'
import './index.css'

const page = placeholderPages[window.location.pathname.replace(/\/+$/, '')]
ReactDOM.createRoot(document.getElementById('root')).render(page ? <PlaceholderPage page={page} /> : <App />)
