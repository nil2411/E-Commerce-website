const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

const sendEmail = async ({ to, subject, html }) => {
    const apiKey = process.env.RESEND_API_KEY?.trim()
    const from = process.env.EMAIL_FROM?.trim()

    if (!apiKey || !from || !to) {
        if (process.env.NODE_ENV !== 'test') {
            console.log(JSON.stringify({ level: 'info', message: 'Email skipped; provider is not configured', subject }))
        }
        return false
    }

    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ from, to: [to], subject, html })
    })

    if (!response.ok) {
        const details = await response.text()
        throw new Error(`Email provider rejected the request: ${response.status} ${details}`)
    }

    return true
}

const sendVerificationEmail = ({ email, name, token, clientUrl }) => sendEmail({
    to: email,
    subject: 'Verify your Forever Store email',
    html: `<h1>Welcome, ${escapeHtml(name)}</h1><p>Verify your email to secure your account.</p><p><a href="${escapeHtml(clientUrl)}/verify-email?token=${escapeHtml(token)}">Verify email</a></p>`
})

const sendPasswordResetEmail = ({ email, token, clientUrl }) => sendEmail({
    to: email,
    subject: 'Reset your Forever Store password',
    html: `<h1>Password reset</h1><p>This link expires in 30 minutes.</p><p><a href="${escapeHtml(clientUrl)}/reset-password?token=${escapeHtml(token)}">Reset password</a></p>`
})

const orderRows = (order) => (order.items || []).map((item) => (
    `<tr><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.size)}</td><td>${escapeHtml(item.quantity)}</td><td>${escapeHtml(item.price)}</td></tr>`
)).join('')

const orderSummary = (order) => (
    `<p>Subtotal: ${escapeHtml(order.paymentCurrency)} ${escapeHtml(order.subtotal || 0)}</p><p>Delivery: ${escapeHtml(order.paymentCurrency)} ${escapeHtml(order.deliveryCharge || 0)}</p><p><strong>Total: ${escapeHtml(order.paymentCurrency)} ${escapeHtml(order.amount)}</strong></p>`
)

const deliveryAddress = (address = {}) => [
    `${address.firstName || ''} ${address.lastName || ''}`.trim(),
    address.street,
    `${address.city || ''}, ${address.state || ''} ${address.zipcode || ''}`.trim(),
    address.country,
    address.phone
].filter(Boolean).map(escapeHtml).join('<br>')

const sendOrderPlacedEmail = ({ order }) => {
    const email = order.address?.email

    return sendEmail({
        to: email,
        subject: `Order placed ${order._id}`,
        html: `<h1>Your order has been placed</h1><p>Thanks for shopping with Forever Store. We have received your order and will start processing it soon.</p><p>Order: <strong>${escapeHtml(order._id)}</strong></p><p>Status: ${escapeHtml(order.status)}</p><p>Payment method: ${escapeHtml(order.paymentMethod)}</p><table><tr><th>Item</th><th>Size</th><th>Qty</th><th>Price</th></tr>${orderRows(order)}</table>${orderSummary(order)}<h2>Delivery address</h2><p>${deliveryAddress(order.address)}</p>`
    })
}

const sendOrderEmail = ({ order, receiptNumber }) => {
    const email = order.address?.email

    return sendEmail({
        to: email,
        subject: `Order confirmed - receipt ${receiptNumber}`,
        html: `<h1>Your order is confirmed</h1><p>Payment received. Receipt: <strong>${escapeHtml(receiptNumber)}</strong></p><p>Order: ${escapeHtml(order._id)}</p><table><tr><th>Item</th><th>Size</th><th>Qty</th><th>Price</th></tr>${orderRows(order)}</table>${orderSummary(order)}`
    })
}

export { sendEmail, sendVerificationEmail, sendPasswordResetEmail, sendOrderPlacedEmail, sendOrderEmail }
