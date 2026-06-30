export const backendUrl = String(import.meta.env.VITE_BACKEND_URL || '').replace(/\/+$/, '');
export const currency = import.meta.env.VITE_CURRENCY_SYMBOL || '₹';
