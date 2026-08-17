import axios from 'axios'

// Phase 8 — the Authorization-header interceptor that used to attach a
// localStorage JWT was removed here: nothing has written a token to
// localStorage since the legacy password login was removed (see
// docs/AUTH.md), and every request already authenticates via the HttpOnly
// session cookie through `withCredentials: true` below.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
})

export default api
