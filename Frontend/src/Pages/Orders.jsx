import React, { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Shopcontext } from '../../Context/Shopcontext'
import Title from '../Components/Title'
import axios from 'axios'
import { toast } from 'react-toastify'

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;')

const currencySymbol = (currency) => ({ USD: '$', INR: '\u20B9' }[currency] || `${currency} `)

const receiptHtml = (receipt) => {
  const symbol = currencySymbol(receipt.currency)
  const items = Array.isArray(receipt.items) ? receipt.items : []
  const customer = receipt.customer || {}
  const itemRows = items.map((item) => `
    <tr>
      <td>${escapeHtml(item.name)}${item.size ? `<br><small>Size: ${escapeHtml(item.size)}</small>` : ''}</td>
      <td>${escapeHtml(item.quantity)}</td>
      <td>${symbol}${Number(item.price || 0).toFixed(2)}</td>
      <td>${symbol}${(Number(item.price || 0) * Number(item.quantity || 0)).toFixed(2)}</td>
    </tr>
  `).join('')

  return `<!doctype html>
  <html><head><title>Receipt ${escapeHtml(receipt.receiptNumber)}</title><meta charset="utf-8">
    <style>
      *{box-sizing:border-box}body{margin:0;background:#f3f4f6;color:#111827;font-family:Arial,sans-serif}
      .receipt{width:min(760px,calc(100% - 32px));margin:32px auto;padding:40px;background:white}
      .header,.summary{display:flex;justify-content:space-between;gap:24px}h1{margin:0 0 6px;letter-spacing:4px}h2{margin:0;font-size:18px}
      p{margin:5px 0;color:#4b5563}.paid{display:inline-block;margin-top:12px;padding:5px 10px;border-radius:999px;background:#dcfce7;color:#166534;font-size:12px;font-weight:bold}
      .customer{margin:32px 0;padding:20px;background:#f9fafb}table{width:100%;border-collapse:collapse}th,td{padding:13px 8px;border-bottom:1px solid #e5e7eb;text-align:right}
      th:first-child,td:first-child{text-align:left}small{color:#6b7280}.summary{align-items:flex-end;margin-top:24px}.total{font-size:21px;font-weight:bold;color:#111827}
      .actions{width:min(760px,calc(100% - 32px));margin:0 auto 32px;text-align:right}button{border:0;padding:12px 20px;background:#111827;color:white;cursor:pointer}
      @media print{body{background:white}.receipt{width:100%;margin:0;padding:20px}.actions{display:none}}
    </style></head>
    <body><main class="receipt">
      <div class="header"><div><h1>FOREVER</h1><p>Payment receipt</p><span class="paid">PAID</span></div>
        <div style="text-align:right"><h2>${escapeHtml(receipt.receiptNumber)}</h2><p>Order: ${escapeHtml(receipt.orderId)}</p><p>${new Date(receipt.paidAt).toLocaleString()}</p></div>
      </div>
      <section class="customer"><strong>Billed to</strong><p>${escapeHtml(`${customer.firstName || ''} ${customer.lastName || ''}`.trim())}</p>
        <p>${escapeHtml(customer.email)}</p><p>${escapeHtml([customer.street, customer.city, customer.state, customer.zipcode, customer.country].filter(Boolean).join(', '))}</p>
      </section>
      <table><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>${itemRows}</tbody></table>
      <div class="summary"><div><p>Payment method: ${escapeHtml(receipt.paymentMethod)}</p><p>Payment ID: ${escapeHtml(receipt.paymentId || 'Not provided')}</p></div>
        <p class="total">Total: ${symbol}${Number(receipt.amount || 0).toFixed(2)}</p></div>
    </main><div class="actions"><button onclick="window.print()">Print / Save as PDF</button></div></body></html>`
}

const Orders = () => {

  const { backendUrl, token, currency, setcartitems } = useContext(Shopcontext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const stripeVerificationStarted = useRef(false);

  const loadOrderData = useCallback(async () => {
    if (!token) {
      setOrders([]);
      return;
    }

    if (!backendUrl) {
      toast.error('Backend URL is not configured');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${backendUrl}/order/userorders`,
        {},
        { headers: { token } }
      );

      if (response.data.success) {
        const nextOrders = Array.isArray(response.data.orders) ? response.data.orders : [];
        setOrders(nextOrders.sort((a, b) => new Date(b.date) - new Date(a.date)));
      } else {
        toast.error(response.data.message || 'Failed to load orders');
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  }, [backendUrl, token]);

  useEffect(() => {
    loadOrderData();
  }, [loadOrderData]);

  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get('stripe_session_id');
    if (!sessionId || !token || !backendUrl || stripeVerificationStarted.current) return;

    stripeVerificationStarted.current = true;
    const verifyPayment = async () => {
      try {
        const response = await axios.post(
          `${backendUrl}/order/verifyStripe`,
          { sessionId },
          { headers: { token } }
        );

        if (response.data.success) {
          setcartitems({});
          const successMessage = response.data.receiptNumber
            ? `Payment successful. Receipt ${response.data.receiptNumber} generated.`
            : (response.data.message || 'Payment successful. Receipt generated.');
          toast.success(successMessage);
          window.history.replaceState({}, '', window.location.pathname);
          await loadOrderData();
        } else {
          toast.error(response.data.message || 'Stripe payment verification failed');
        }
      } catch (error) {
        toast.error(error?.response?.data?.message || error.message);
      }
    };

    verifyPayment();
  }, [backendUrl, loadOrderData, setcartitems, token]);

  const openReceipt = async (orderId) => {
    const receiptWindow = window.open('', '_blank', 'width=900,height=800');
    if (!receiptWindow) {
      toast.error('Please allow pop-ups to view your receipt');
      return;
    }

    receiptWindow.document.write('<p style="font-family:Arial;padding:24px">Generating receipt...</p>');
    try {
      const response = await axios.post(
        `${backendUrl}/order/receipt`,
        { orderId },
        { headers: { token } }
      );

      if (!response.data.success) {
        receiptWindow.close();
        toast.error(response.data.message || 'Could not generate receipt');
        return;
      }

      receiptWindow.document.open();
      receiptWindow.document.write(receiptHtml(response.data.receipt));
      receiptWindow.document.close();
    } catch (error) {
      receiptWindow.close();
      toast.error(error?.response?.data?.message || error.message);
    }
  };

  const cancelOrder = async (orderId) => {
    if (!window.confirm('Cancel this order? Paid orders will be refunded to the original payment method.')) return;
    try {
      const response = await axios.post(`${backendUrl}/order/cancel`, { orderId }, { headers: { token } });
      toast.success(response.data.message);
      await loadOrderData();
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    }
  };

  return (
    <div className='border-t pt-16'>
      <div className='text-2xl'>
        <Title title1={'MY'} title2={'ORDERS'} />
      </div>

      <div>
        {loading ? (
          <p className='py-6 text-sm text-gray-500'>Loading orders...</p>
        ) : orders.length === 0 ? (
          <p className='py-6 text-sm text-gray-500'>{token ? 'No orders found.' : 'Please login to view your orders.'}</p>
        ) : orders.map((order) => (
          <section key={order._id} className='py-5 border-b text-gray-700'>
            <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 text-sm'>
              <div>
                <p className='font-medium'>Order #{String(order._id).slice(-8).toUpperCase()}</p>
                <p className='text-gray-400'>{order.date ? new Date(order.date).toDateString() : ''}</p>
              </div>
              <div className='flex flex-wrap items-center gap-3'>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${order.payment ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                  {order.payment ? 'Paid' : 'Payment Pending'}
                </span>
                {order.payment && (
                  <button onClick={() => openReceipt(order._id)} className='border px-4 py-2 text-sm font-medium rounded-sm cursor-pointer'>
                    View Receipt
                  </button>
                )}
                <button onClick={loadOrderData} className='border px-4 py-2 text-sm font-medium rounded-sm cursor-pointer'>Track Order</button>
                {['Order Placed', 'Packing'].includes(order.status) && (
                  <button onClick={() => cancelOrder(order._id)} className='border border-red-200 text-red-600 px-4 py-2 text-sm font-medium rounded-sm cursor-pointer'>Cancel</button>
                )}
              </div>
            </div>

            {(Array.isArray(order.items) ? order.items : []).map((item, index) => (
              <div key={`${item._id || item.name}-${item.size}-${index}`} className='py-3 flex items-start justify-between gap-6 text-sm'>
                <div className='flex items-start gap-5'>
                  <img className='w-16 sm:w-20' src={item.images?.[0]} alt={item.name} />
                  <div>
                    <p className='sm:text-base font-medium'>{item.name}</p>
                    <div className='flex flex-wrap items-center gap-3 mt-1 text-gray-600'>
                      <p>{currency}{item.price}</p>
                      <p>Quantity: {item.quantity}</p>
                      <p>Size: {item.size}</p>
                    </div>
                    <p className='mt-1'>Payment: <span className='text-gray-400'>{order.paymentMethod}</span></p>
                  </div>
                </div>
                <div className='flex items-center gap-2'>
                  <span className='inline-block w-2 h-2 rounded-full bg-green-500' />
                  <p>{order.status}</p>
                </div>
              </div>
            ))}
          </section>
        ))}
      </div>

    </div>
  )
}

export default Orders
