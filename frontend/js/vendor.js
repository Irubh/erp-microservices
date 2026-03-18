const API = {
    PO: 'http://localhost:8000/api',
    PRODUCTS: 'http://localhost:8002',
}

document.addEventListener('DOMContentLoaded', async () => {
    const user = Auth.requireRole('vendor')
    if (!user) return

    document.getElementById('nav-user').textContent = user.name
    document.getElementById('vendor-name').textContent = user.vendor_name || user.name
    document.getElementById('vendor-email').textContent = user.sub

    connectSocket()

    await loadMyPOs()
    await loadProducts()
})

function showTab(name, el) {
    document.querySelectorAll('.tab-pane').forEach(t => t.classList.remove('active'))
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'))
    document.getElementById(`tab-${name}`).classList.add('active')
    el.classList.add('active')
}

async function loadMyPOs() {
    try {
        const res = await Auth.api(`${API.PO}/purchase-orders/my`)
        const pos = await res.json()

        // Update stats
        document.getElementById('s-total').textContent = pos.length
        document.getElementById('s-pending').textContent = pos.filter(p => String(p.status).toLowerCase() === 'pending').length
        document.getElementById('s-approved').textContent = pos.filter(p => String(p.status).toLowerCase() === 'approved').length

        const tbody = document.getElementById('my-po-tbody')

        if (!pos.length) {
            tbody.innerHTML = `<tr><td colspan="4" class="empty">No purchase orders for your account yet.</td></tr>`
            return
        }

        // Render rows with approve/reject buttons for pending POs 
        tbody.innerHTML = pos.map(po => {
            const isPending = String(po.status).toLowerCase() === 'pending'
            return `
            <tr>
              <td>${po.reference_no || '—'}</td>
              <td>$${parseFloat(po.total_amount || 0).toFixed(2)}</td>
              <td>${badge(po.status)}</td>
              <td>
                ${isPending
                    ? `<button class="btn-approve" onclick="updateStatus(${po.id}, 'approved')">
                    ✓ Approve
                  </button>
                  <button class="btn-reject" onclick="updateStatus(${po.id}, 'rejected')">
                    ✕ Reject
                  </button>`
                    : '—'}
              </td>
            </tr>
        `
        }).join('')

    } catch (e) {
        document.getElementById('my-po-tbody').innerHTML =
            `<tr><td colspan="4" class="empty">Failed to load. Is purchase-order service running?</td></tr>`
    }
}

// Approve or Reject a PO 
async function updateStatus(poId, status) {
    const confirmed = confirm(`Are you sure you want to ${status} PO #${poId}?`)
    if (!confirmed) return

    try {
        const res = await Auth.api(
            `${API.PO}/purchase-orders/${poId}/status?new_status=${status}`,
            { method: 'PUT' }
        )

        if (res.ok) {
            showToast(`PO #${poId} ${status} successfully`)
            await loadMyPOs()  // refresh vendor table
        } else {
            const err = await res.json()
            alert(err.detail || 'Failed to update status.')
        }
    } catch (e) {
        alert('Error connecting to server.')
    }
}

async function loadProducts() {
    try {
        const res = await Auth.api(`${API.PRODUCTS}/products`)
        const prods = await res.json()
        document.getElementById('product-tbody').innerHTML =
            prods.map(p => `
        <tr>
          <td>${p.name}</td>
          <td>${p.sku}</td>
          <td>$${parseFloat(p.unit_price || 0).toFixed(2)}</td>
          <td>${p.stock_level}</td>
        </tr>
      `).join('') || `<tr><td colspan="4" class="empty">No products found.</td></tr>`
    } catch (e) {
        document.getElementById('product-tbody').innerHTML =
            `<tr><td colspan="4" class="empty">Failed to load products.</td></tr>`
    }
}

function badge(s) {
    const cls = {
        pending: 'badge-pending',
        approved: 'badge-approved',
        rejected: 'badge-rejected',
        draft: 'badge-draft'
    }
    const key = String(s || '').toLowerCase()
    return `<span class="badge ${cls[key] || 'badge-draft'}">${s}</span>`
}

function connectSocket() {
    const s = document.createElement('script')
    s.src = 'https://cdn.socket.io/4.7.2/socket.io.min.js'
    s.onload = () => {
        try {
            const socket = io('http://localhost:8004', { auth: { token: Auth.get() } })
            socket.on('notification', async d => {
                showToast(d.message)
                await loadMyPOs()
            })
            socket.on('connect_error', e => console.warn('Socket:', e.message))
        } catch (e) { }
    }
    document.head.appendChild(s)
}

function showToast(msg) {
    const t = document.getElementById('toast')
    document.getElementById('toast-msg').textContent = msg
    t.classList.add('show')
    setTimeout(() => t.classList.remove('show'), 6000)
}