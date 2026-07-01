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

const formatMoney = (order, value) => {
    const amount = Number(value || 0)
    const formatted = Number.isInteger(amount) ? String(amount) : amount.toFixed(2)
    return `${String(order.paymentCurrency || '').toUpperCase()} ${formatted}`
}

const formatPaymentMethod = (method) => ({
    COD: 'Cash on delivery',
    stripe: 'Stripe',
    razorpay: 'Razorpay'
}[method] || method || 'Not available')

const deliveryAddressLines = (address = {}) => [
    `${address.firstName || ''} ${address.lastName || ''}`.trim(),
    address.street,
    `${address.city || ''}, ${address.state || ''} ${address.zipcode || ''}`.trim(),
    address.country,
    address.phone
].filter(Boolean)

const orderRows = (order) => (order.items || []).map((item) => `
    <tr>
        <td style="padding:16px 0;border-bottom:1px solid #e5e7eb;color:#111827;font-size:14px;line-height:20px;">
            <strong>${escapeHtml(item.name)}</strong>
        </td>
        <td style="padding:16px 12px;border-bottom:1px solid #e5e7eb;color:#374151;font-size:14px;text-align:center;white-space:nowrap;">${escapeHtml(item.size || '-')}</td>
        <td style="padding:16px 12px;border-bottom:1px solid #e5e7eb;color:#374151;font-size:14px;text-align:center;white-space:nowrap;">${escapeHtml(item.quantity)}</td>
        <td style="padding:16px 0;border-bottom:1px solid #e5e7eb;color:#111827;font-size:14px;text-align:right;white-space:nowrap;">${escapeHtml(formatMoney(order, item.price))}</td>
    </tr>
`).join('')

const emailShell = ({ title, intro, order, receiptNumber }) => {
    const addressHtml = deliveryAddressLines(order.address).map(escapeHtml).join('<br>')
    const receiptHtml = receiptNumber
        ? `<tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Receipt</td><td style="padding:6px 0;color:#111827;font-size:13px;text-align:right;font-weight:700;">${escapeHtml(receiptNumber)}</td></tr>`
        : ''

    return `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;padding:32px 12px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
                    <tr>
                        <td style="padding:28px 32px;background:#111827;color:#ffffff;">
                            <p style="margin:0 0 8px;font-size:12px;letter-spacing:1.8px;text-transform:uppercase;color:#f9a8d4;">Forever Store</p>
                            <h1 style="margin:0;font-size:26px;line-height:34px;font-weight:700;">${escapeHtml(title)}</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:28px 32px;">
                            <p style="margin:0 0 22px;color:#374151;font-size:15px;line-height:24px;">${escapeHtml(intro)}</p>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:26px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:12px 16px;">
                                <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Order ID</td><td style="padding:6px 0;color:#111827;font-size:13px;text-align:right;font-weight:700;">${escapeHtml(order._id)}</td></tr>
                                ${receiptHtml}
                                <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Status</td><td style="padding:6px 0;color:#111827;font-size:13px;text-align:right;">${escapeHtml(order.status)}</td></tr>
                                <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Payment</td><td style="padding:6px 0;color:#111827;font-size:13px;text-align:right;">${escapeHtml(formatPaymentMethod(order.paymentMethod))}</td></tr>
                            </table>

                            <h2 style="margin:0 0 12px;font-size:18px;line-height:24px;color:#111827;">Items</h2>
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-bottom:24px;">
                                <tr>
                                    <th align="left" style="padding:0 0 10px;border-bottom:2px solid #111827;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:.5px;">Item</th>
                                    <th style="padding:0 12px 10px;border-bottom:2px solid #111827;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:.5px;text-align:center;">Size</th>
                                    <th style="padding:0 12px 10px;border-bottom:2px solid #111827;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:.5px;text-align:center;">Qty</th>
                                    <th align="right" style="padding:0 0 10px;border-bottom:2px solid #111827;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:.5px;text-align:right;">Price</th>
                                </tr>
                                ${orderRows(order)}
                            </table>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:26px;">
                                <tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">Subtotal</td><td style="padding:6px 0;color:#111827;font-size:14px;text-align:right;">${escapeHtml(formatMoney(order, order.subtotal))}</td></tr>
                                <tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">Delivery</td><td style="padding:6px 0;color:#111827;font-size:14px;text-align:right;">${escapeHtml(formatMoney(order, order.deliveryCharge))}</td></tr>
                                <tr><td style="padding:14px 0 0;border-top:1px solid #e5e7eb;color:#111827;font-size:16px;font-weight:700;">Total</td><td style="padding:14px 0 0;border-top:1px solid #e5e7eb;color:#111827;font-size:18px;font-weight:700;text-align:right;">${escapeHtml(formatMoney(order, order.amount))}</td></tr>
                            </table>

                            <h2 style="margin:0 0 10px;font-size:18px;line-height:24px;color:#111827;">Delivery address</h2>
                            <p style="margin:0;color:#374151;font-size:14px;line-height:22px;">${addressHtml}</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:18px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px;line-height:18px;">
                            This email was sent for your Forever Store order.
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`
}

const sendOrderPlacedEmail = ({ order }) => {
    const email = order.address?.email

    return sendEmail({
        to: email,
        subject: `Order placed ${order._id}`,
        html: emailShell({
            title: 'Your order has been placed',
            intro: 'Thanks for shopping with Forever Store. We have received your order and will start processing it soon.',
            order
        })
    })
}

const sendOrderEmail = ({ order, receiptNumber }) => {
    const email = order.address?.email

    return sendEmail({
        to: email,
        subject: `Order confirmed - receipt ${receiptNumber}`,
        html: emailShell({
            title: 'Your order is confirmed',
            intro: 'Payment received. Your receipt and order details are below.',
            order,
            receiptNumber
        })
    })
}

export { sendEmail, sendVerificationEmail, sendPasswordResetEmail, sendOrderPlacedEmail, sendOrderEmail }
