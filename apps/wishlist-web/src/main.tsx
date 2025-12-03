import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const VERSION = 'crimson-elephant';
console.log(`%c🎁 Wishlist App ${VERSION}`, 'color: #4F46E5; font-weight: bold; font-size: 14px;');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
