// Configuración centralizada de la URL del Backend (Render en producción / .env de Vite)
export const API_BASE_URL: string = (
  import.meta.env.VITE_API_URL || "https://do-a-mantequilla-website.onrender.com"
).replace(/\/+$/, "");
