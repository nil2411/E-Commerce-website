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

const sendOrderEmail = ({ order, receiptNumber }) => {
    const email = order.address?.email
    const rows = (order.items || []).map((item) => (
        `<tr><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.quantity)}</td><td>${escapeHtml(item.price)}</td></tr>`
    )).join('')

    return sendEmail({
        to: email,
        subject: `Payment receipt ${receiptNumber}`,
        html: `<h1>Payment received</h1><p>Receipt: <strong>${escapeHtml(receiptNumber)}</strong></p><p>Order: ${escapeHtml(order._id)}</p><table><tr><th>Item</th><th>Qty</th><th>Price</th></tr>${rows}</table><p>Total: ${escapeHtml(order.paymentCurrency)} ${escapeHtml(order.amount)}</p>`
    })
}

export { sendEmail, sendVerificationEmail, sendPasswordResetEmail, sendOrderEmail }
