const API = {
    PO: 'http://localhost:8000/api',
    PRODUCTS: 'http://localhost:8002',
    VENDORS: 'http://localhost:8003',
    AUTH: 'http://localhost:8001',
}

let allPOs = []
let _products = []
let rowCount = 0

// Boot 
document.addEventListener('DOMContentLoaded', async () => {
    const user = Auth.requireRole('employee')
    if (!user) return

    document.getElementById('nav-user').textContent = user.name

    connectSocket()

    await loadPOs()
    await loadVendors()
    await loadProductsList()
})

// Tabs
function showTab(name, el) {
    document.querySelectorAll('.tab-pane').forEach(t => t.classList.remove('active'))
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'))
    document.getElementById(`tab-${name}`).classList.add('active')
    el.classList.add('active')
}

// Purchase Orders
async function loadPOs() {
    try {
        const res = await Auth.api(`${API.PO}/purchase-orders`)
        allPOs = await res.json()
        renderPOs(allPOs)
        renderStats(allPOs)
    } catch (e) {
        document.getElementById('po-tbody').innerHTML =
            `<tr><td colspan="5" class="empty">Failed to load. Is purchase-order service running on port 8000?</td></tr>`
    }
}

function renderPOs(list) {
    const tbody = document.getElementById('po-tbody')
    if (!list.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="empty">No purchase orders found.</td></tr>`
        return
    }
    tbody.innerHTML = list.map(po => `
    <tr>
      <td>${po.reference_no || '—'}</td>
      <td>${po.vendor_id}</td>
      <td>$${parseFloat(po.total_amount || 0).toFixed(2)}</td>
      <td>${badge(po.status)}</td>
    </tr>
  `).join('')
}

function badge(s) {
    const cls = { pending: 'badge-pending', approved: 'badge-approved', rejected: 'badge-rejected', draft: 'badge-draft' }
    const key = String(s || '').toLowerCase()
    return `<span class="badge ${cls[key] || 'badge-draft'}">${s}</span>`
}

function renderStats(list) {
    document.getElementById('s-total').textContent = list.length
    document.getElementById('s-pending').textContent = list.filter(p => String(p.status).toLowerCase() === 'pending').length
    document.getElementById('s-approved').textContent = list.filter(p => String(p.status).toLowerCase() === 'approved').length
    document.getElementById('s-rejected').textContent = list.filter(p => String(p.status).toLowerCase() === 'rejected').length
}

function renderPOs(list) {
    const tbody = document.getElementById('po-tbody')
    if (!list.length) {
        tbody.innerHTML = `<tr><td colspan="4" class="empty">No purchase orders found.</td></tr>`
        return
    }
    tbody.innerHTML = list.map(po => `
    <tr>
      <td>${po.reference_no || '—'}</td>
      <td>${po.vendor_id}</td>
      <td>$${parseFloat(po.total_amount || 0).toFixed(2)}</td>
      <td>${badge(po.status)}</td>
    </tr>
  `).join('')
}

async function updateStatus(poId, status) {
    if (!status) return
    try {
        await Auth.api(`${API.PO}/purchase-orders/${poId}/status?new_status=${status}`, { method: 'PUT' })
        showToast(`PO #${poId} updated to "${status}"`)
        await loadPOs()
    } catch (e) {
        alert('Failed to update status.')
    }
}

// Vendors
async function loadVendors() {
    try {
        const res = await Auth.api(`${API.VENDORS}/vendors`)
        const vendors = await res.json()

        // Populate vendor select in Create PO tab
        const sel = document.getElementById('vendor-select')
        sel.innerHTML = '<option value="">— Select Vendor —</option>' +
            vendors.map(v => `<option value="${v.id}">${v.name}</option>`).join('')

        // Populate vendors tab
        document.getElementById('vendor-tbody').innerHTML =
            vendors.map(v => `
        <tr>
          <td>${v.name}</td>
          <td>${v.contact || '—'}</td>
          <td>${'★'.repeat(Math.round(v.rating || 0))}${'☆'.repeat(5 - Math.round(v.rating || 0))}</td>
        </tr>
      `).join('') || `<tr><td colspan="3" class="empty">No vendors found.</td></tr>`

    } catch (e) {
        document.getElementById('vendor-tbody').innerHTML =
            `<tr><td colspan="3" class="empty">Failed to load. Is vendor service running on port 8003?</td></tr>`
    }
}

// Products list
async function loadProductsList() {
    try {
        const res = await Auth.api(`${API.PRODUCTS}/products`)
        _products = await res.json()

        document.getElementById('product-list-tbody').innerHTML =
            _products.map(p => `
        <tr>
          <td>${p.name}</td>
          <td>${p.sku}</td>
          <td>$${parseFloat(p.unit_price || 0).toFixed(2)}</td>
          <td>${p.stock_level}</td>
        </tr>
      `).join('') || `<tr><td colspan="4" class="empty">No products found.</td></tr>`

    } catch (e) {
        document.getElementById('product-list-tbody').innerHTML =
            `<tr><td colspan="4" class="empty">Failed to load products.</td></tr>`
    }
}

// Create PO 
let createInited = false

async function initCreateForm() {
    if (createInited) return
    createInited = true
    addProductRow()
}

function addProductRow() {
    rowCount++
    const id = rowCount
    const row = document.createElement('tr')
    row.id = `row-${id}`

    const opts = _products.map(p =>
        `<option value="${p.id}" data-price="${p.unit_price}" data-name="${p.name}">
      ${p.name}
    </option>`
    ).join('')

    row.innerHTML = `
    <td>
      <select class="form-control" id="psel-${id}" onchange="onPick(this,${id})">
        <option value="">— Select —</option>
        ${opts}
      </select>
    </td>
    <td><input type="number" class="form-control" id="qty-${id}"   value="1" min="1" onchange="recalc()"/></td>
    <td><input type="number" class="form-control" id="price-${id}" readonly placeholder="—"/></td>
    <td><span id="sub-${id}">$0.00</span></td>
    <td>
      <button class="btn btn-secondary btn-sm" onclick="getAIDesc(${id})">✨ AI</button>
    </td>
    <td>
      <button class="btn btn-danger btn-sm" onclick="removeRow(${id})">✕</button>
    </td>
  `
    document.getElementById('product-rows').appendChild(row)
}

function onPick(sel, id) {
    const opt = sel.selectedOptions[0]
    if (!opt?.value) return
    document.getElementById(`price-${id}`).value = opt.dataset.price
    recalc()
}

function removeRow(id) {
    document.getElementById(`row-${id}`)?.remove()
    recalc()
}

function recalc() {
    let sub = 0
    document.querySelectorAll('#product-rows tr').forEach(row => {
        const id = row.id.split('-')[1]
        const qty = parseFloat(document.getElementById(`qty-${id}`)?.value || 0)
        const price = parseFloat(document.getElementById(`price-${id}`)?.value || 0)
        const s = qty * price
        const el = document.getElementById(`sub-${id}`)
        if (el) el.textContent = `$${s.toFixed(2)}`
        sub += s
    })
    const tax = sub * 0.05
    const total = sub + tax
    document.getElementById('d-sub').textContent = `$${sub.toFixed(2)}`
    document.getElementById('d-tax').textContent = `$${tax.toFixed(2)}`
    document.getElementById('d-total').textContent = `$${total.toFixed(2)}`
}

async function getAIDesc(id) {
    const sel = document.getElementById(`psel-${id}`)
    const opt = sel?.selectedOptions[0]
    if (!opt?.value) return alert('Select a product first.')

    const box = document.getElementById('ai-desc-box')
    const text = document.getElementById('ai-desc-text')
    box.style.display = 'block'
    text.textContent = 'Generating...'

    try {
        const res = await Auth.api(`${API.PRODUCTS}/products/auto-description`, {
            method: 'POST',
            body: JSON.stringify({ name: opt.dataset.name })
        })
        const data = await res.json()
        text.textContent = data.description || 'No description generated.'
    } catch (e) {
        text.textContent = 'Failed to generate description.'
    }
}

async function submitPO() {
    const vendorId = document.getElementById('vendor-select').value
    if (!vendorId) return showMsg('error', 'Please select a vendor.')

    const items = [...document.querySelectorAll('#product-rows tr')].map(row => {
        const id = row.id.split('-')[1]
        return {
            product_id: document.getElementById(`psel-${id}`)?.value,
            quantity: parseFloat(document.getElementById(`qty-${id}`)?.value || 0),
            unit_price: parseFloat(document.getElementById(`price-${id}`)?.value || 0)
        }
    }).filter(i => i.product_id && i.quantity > 0 && i.unit_price > 0)

    if (!items.length) return showMsg('error', 'Add at least one product.')

    const refNo = `PO-${Date.now()}`
    document.getElementById('ref-no').value = refNo

    const res = await Auth.api(`${API.PO}/purchase-orders`, {
        method: 'POST',
        body: JSON.stringify({ reference_no: refNo, vendor_id: parseInt(vendorId), items })
    })

    if (res.ok) {
        const data = await res.json()
        showMsg('success', `PO created! ID: ${data.po_id}, Reference: ${refNo}`)
        resetForm()
        await loadPOs()
    } else {
        const err = await res.json()
        showMsg('error', err.detail || 'Failed to create PO.')
    }
}

function resetForm() {
    document.getElementById('vendor-select').value = ''
    document.getElementById('ref-no').value = ''
    document.getElementById('product-rows').innerHTML = ''
    document.getElementById('ai-desc-box').style.display = 'none'
    rowCount = 0
    createInited = false
    addProductRow()
    recalc()
}

function showMsg(type, msg) {
    const s = document.getElementById('po-success')
    const e = document.getElementById('po-error')
    s.style.display = 'none'
    e.style.display = 'none'
    if (type === 'success') { s.textContent = msg; s.style.display = 'block' }
    else { e.textContent = msg; e.style.display = 'block' }
}

// Socket notifications 
function connectSocket() {
    const s = document.createElement('script')
    s.src = 'https://cdn.socket.io/4.7.2/socket.io.min.js'
    s.onload = () => {
        try {
            const socket = io('http://localhost:8004', { auth: { token: Auth.get() } })
            socket.on('notification', d => showToast(d.message))
            socket.on('connect_error', e => console.warn('Socket:', e.message))
        } catch (e) { }
    }
    document.head.appendChild(s)
}

function showToast(msg) {
    const t = document.getElementById('toast')
    document.getElementById('toast-msg').textContent = msg
    t.classList.add('show')
    setTimeout(() => t.classList.remove('show'), 5000)
}
setInterval(async () => {
    await loadPOs()
}, 10000)