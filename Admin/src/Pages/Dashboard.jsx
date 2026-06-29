import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { backendUrl, currency } from '../constants2'

const Dashboard = ({ token }) => {
  const [data, setData] = useState(null)

  useEffect(() => {
    axios.get(`${backendUrl}/order/dashboard`, { headers: { token } }).then((response) => {
      setData(response.data.dashboard)
    }).catch((error) => toast.error(error.response?.data?.message || error.message))
  }, [token])

  if (!data) return <p>Loading dashboard...</p>

  const cards = [
    ['Revenue', `${currency}${Number(data.revenue).toFixed(2)}`],
    ['Orders', data.orderCount],
    ['Paid orders', data.paidOrders],
    ['Customers', data.customerCount]
  ]

  return (
    <div>
      <h1 className='text-2xl font-semibold text-gray-800 mb-6'>Store Dashboard</h1>
      <div className='grid sm:grid-cols-2 xl:grid-cols-4 gap-4'>
        {cards.map(([label, value]) => <div key={label} className='bg-white border rounded p-5'><p className='text-sm text-gray-500'>{label}</p><p className='text-2xl font-semibold mt-2'>{value}</p></div>)}
      </div>
      <div className='grid lg:grid-cols-2 gap-5 mt-6'>
        <section className='bg-white border rounded p-5'>
          <h2 className='font-semibold mb-4'>Orders by status</h2>
          {data.byStatus.map((item) => <div key={item._id} className='flex justify-between border-b py-2 text-sm'><span>{item._id}</span><strong>{item.count}</strong></div>)}
        </section>
        <section className='bg-white border rounded p-5'>
          <h2 className='font-semibold mb-4'>Recent orders</h2>
          {data.recentOrders.map((order) => <div key={order._id} className='flex justify-between border-b py-2 text-sm'><span>{order.address?.email || order._id}</span><strong>{currency}{order.amount}</strong></div>)}
        </section>
      </div>
    </div>
  )
}

export default Dashboard
