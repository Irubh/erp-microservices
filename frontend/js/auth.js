const Auth = (() => {
    const KEY = 'po_jwt'

    function save(token) { localStorage.setItem(KEY, token) }
    function get() { return localStorage.getItem(KEY) }

    function getUser() {
        const t = get()
        if (!t) return null
        try { return JSON.parse(atob(t.split('.')[1])) }
        catch { return null }
    }

    function isLoggedIn() {
        const u = getUser()
        return u ? u.exp * 1000 > Date.now() : false
    }

    function logout() {
        localStorage.removeItem(KEY)
        window.location.href = '../index.html'
    }

    // Call at top of every protected page — redirects if wrong role
    function requireRole(role) {
        if (!isLoggedIn()) { window.location.href = '../index.html'; return null }
        const u = getUser()
        if (u.role !== role) { window.location.href = '../index.html'; return null }
        return u
    }

    // Fetch wrapper — attaches JWT to every request automatically
    async function api(url, options = {}) {
        const res = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${get()}`,
                ...(options.headers || {})
            }
        })
        if (res.status === 401) {
            alert('Session expired. Please log in again.')
            logout()
        }
        return res
    }

    return { save, get, getUser, isLoggedIn, logout, requireRole, api }
})()