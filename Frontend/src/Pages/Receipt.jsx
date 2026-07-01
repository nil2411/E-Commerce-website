import React, { useContext, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import { toast } from 'react-toastify'
import { Shopcontext } from '../../Context/Shopcontext'

const currencySymbol = (currency) => ({ USD: '$', INR: '\u20B9' }[currency] || `${currency} `)

const formatAddress = (customer = {}) => [
  `${customer.firstName || ''} ${customer.lastName || ''}`.trim(),
  customer.email,
  [customer.street, customer.city, customer.state, customer.zipcode, customer.country].filter(Boolean).join(', ')
].filter(Boolean)

const Receipt = () => {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const { backendUrl, token } = useContext(Shopcontext)
  const [receipt, setReceipt] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token || !backendUrl || !orderId) {
      setLoading(false)
      return
    }

    let active = true
    setLoading(true)
    axios.post(`${backendUrl}/order/receipt`, { orderId }, { headers: { token } })
      .then((response) => {
        if (!active) return
        if (response.data.success) {
          setReceipt(response.data.receipt)
        } else {
          toast.error(response.data.message || 'Could not load receipt')
        }
      })
      .catch((error) => {
        if (active) toast.error(error?.response?.data?.message || error.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [backendUrl, orderId, token])

  if (!token) {
    return (
      <div className='border-t min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center'>
        <h1 className='text-2xl font-semibold text-gray-800'>Receipt access</h1>
        <p className='text-sm text-gray-500'>Log in to download your receipt.</p>
        <button onClick={() => navigate('/login')} className='bg-black text-white px-6 py-3 text-sm cursor-pointer'>Login</button>
      </div>
    )
  }

  if (loading) {
    return <div className='border-t py-16 text-sm text-gray-500'>Loading receipt...</div>
  }

  if (!receipt) {
    return <div className='border-t py-16 text-sm text-gray-500'>Receipt not available.</div>
  }

  const symbol = currencySymbol(receipt.currency)
  const items = Array.isArray(receipt.items) ? receipt.items : []

  return (
    <div className='border-t py-10'>
      <div className='mx-auto max-w-3xl'>
        <div className='mb-5 flex justify-end print:hidden'>
          <button onClick={() => window.print()} className='bg-black px-6 py-3 text-sm text-white cursor-pointer'>
            Download Receipt
          </button>
        </div>

        <main className='bg-white p-8 sm:p-10 text-gray-800 print:p-0'>
          <div className='flex flex-col gap-5 border-b pb-6 sm:flex-row sm:items-start sm:justify-between'>
            <div>
              <h1 className='text-3xl font-semibold tracking-[0.2em]'>FOREVER</h1>
              <p className='mt-2 text-sm text-gray-500'>Payment receipt</p>
              <span className='mt-4 inline-flex rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700'>PAID</span>
            </div>
            <div className='sm:text-right'>
              <p className='text-lg font-semibold'>{receipt.receiptNumber}</p>
              <p className='mt-1 text-sm text-gray-500'>Order: {receipt.orderId}</p>
              <p className='mt-1 text-sm text-gray-500'>{new Date(receipt.paidAt).toLocaleString()}</p>
            </div>
          </div>

          <section className='my-8 bg-gray-50 p-5'>
            <p className='mb-2 font-semibold'>Billed to</p>
            {formatAddress(receipt.customer).map((line) => (
              <p key={line} className='text-sm leading-6 text-gray-600'>{line}</p>
            ))}
          </section>

          <table className='w-full border-collapse text-sm'>
            <thead>
              <tr className='border-b border-gray-900 text-left text-xs uppercase tracking-wide text-gray-500'>
                <th className='py-3'>Item</th>
                <th className='py-3 text-center'>Qty</th>
                <th className='py-3 text-right'>Price</th>
                <th className='py-3 text-right'>Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={`${item.name}-${item.size}-${index}`} className='border-b'>
                  <td className='py-4'>
                    <p className='font-medium'>{item.name}</p>
                    {item.size && <p className='mt-1 text-xs text-gray-500'>Size: {item.size}</p>}
                  </td>
                  <td className='py-4 text-center'>{item.quantity}</td>
                  <td className='py-4 text-right'>{symbol}{Number(item.price || 0).toFixed(2)}</td>
                  <td className='py-4 text-right'>{symbol}{(Number(item.price || 0) * Number(item.quantity || 0)).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className='mt-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between'>
            <div className='text-sm text-gray-500'>
              <p>Payment method: {receipt.paymentMethod}</p>
              <p>Payment ID: {receipt.paymentId || 'Not provided'}</p>
            </div>
            <div className='min-w-52 text-sm'>
              <div className='flex justify-between gap-8 py-1'>
                <span className='text-gray-500'>Subtotal</span>
                <span>{symbol}{Number(receipt.subtotal || 0).toFixed(2)}</span>
              </div>
              <div className='flex justify-between gap-8 py-1'>
                <span className='text-gray-500'>Delivery</span>
                <span>{symbol}{Number(receipt.deliveryCharge || 0).toFixed(2)}</span>
              </div>
              <div className='mt-2 flex justify-between gap-8 border-t pt-3 text-lg font-semibold'>
                <span>Total</span>
                <span>{symbol}{Number(receipt.amount || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default Receipt
