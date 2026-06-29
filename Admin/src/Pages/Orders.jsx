/* eslint react-hooks/set-state-in-effect: off */
import React, { useCallback, useEffect, useState } from 'react'
import axios from 'axios';
import { backendUrl, currency } from '../constants2'
import { toast } from 'react-toastify';
import { assets } from '../assets/assets';

const statusOptions = [
  'Order Placed',
  'Packing',
  'Shipped',
  'Out for delivery',
  'Delivered',
  'Cancelled'
];

const formatAddress = (address) => [
  address?.street,
  address?.city,
  address?.state,
  address?.zipcode,
  address?.country
].filter(Boolean).join(', ');

const formatDate = (date) => {
  if (!date) return 'No date';
  return new Date(date).toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const Orders = ({ token }) => {
  const [orders, setOrders] = useState([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchAllOrders = useCallback(async () => {
    if (!token) {
      return null;
    }

    try {
      const response = await axios.post(backendUrl + '/order/list', { query, status: statusFilter }, { headers: { token: token } });
      if (response.data.success) {
        setOrders(Array.isArray(response.data.orders) ? response.data.orders : []);
      }
      else {
        toast.error(response.data.message);
      }


    } catch (error) {
      console.log(error);
      toast.error(error.message);
    }

  }, [query, statusFilter, token])

  const refundHandler = async (orderId) => {
    if (!window.confirm('Refund this payment and cancel the order?')) return;
    try {
      const response = await axios.post(`${backendUrl}/order/refund`, { orderId }, { headers: { token } });
      toast.success(response.data.message);
      await fetchAllOrders();
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    }
  };

  const statusHandler = async (event, orderId) => {
    const status = event.target.value;

    try {
      const response = await axios.post(
        backendUrl + '/order/status',
        { orderId, status },
        { headers: { token } }
      );

      if (response.data.success) {
        setOrders((prevOrders) =>
          prevOrders.map((order) =>
            order._id === orderId
              ? {
                  ...order,
                  status,
                  payment: response.data.payment ?? order.payment,
                  receiptNumber: response.data.receiptNumber ?? order.receiptNumber
                }
              : order
          )
        );
        toast.success(response.data.message || 'Order status updated');
      } else {
        toast.error(response.data.message || 'Failed to update status');
      }
    } catch (error) {
      console.log(error);
      toast.error(error.response?.data?.message || error.message);
    }
  };

  useEffect(() => {
    fetchAllOrders();
  }, [fetchAllOrders])

  return (
    <div className='w-full'>
      <div className='mb-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <p className='text-xs font-semibold uppercase tracking-wide text-[#c586a5]'>Admin Orders</p>
          <h3 className='text-2xl font-semibold text-gray-800'>Order Management</h3>
        </div>
        <p className='text-sm text-gray-500'>{orders.length} {orders.length === 1 ? 'order' : 'orders'} found</p>
      </div>

      <div className='mb-5 flex flex-col sm:flex-row gap-3'>
        <input value={query} onChange={(event) => setQuery(event.target.value)} className='border px-3 py-2 min-w-72' placeholder='Search customer email or name' />
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className='border px-3 py-2'>
          <option value=''>All statuses</option>
          {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
      </div>

      {orders.length === 0 ? (
        <div className='rounded border border-dashed border-gray-300 bg-white px-6 py-12 text-center'>
          <img className='mx-auto mb-4 w-14 opacity-60' src={assets.parcel_icon} alt="" />
          <p className='font-medium text-gray-700'>No orders yet</p>
          <p className='mt-1 text-sm text-gray-500'>New customer orders will appear here.</p>
        </div>
      ) : (
        <div className='flex flex-col gap-4'>
          {orders.map((order, index) => {
            const orderItems = Array.isArray(order.items) ? order.items : [];
            const address = order.address || {};
            const customerName = [address.firstName, address.lastName].filter(Boolean).join(' ') || 'Customer';

            return (
              <div
                key={order._id || index}
                className='grid gap-5 rounded border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-[80px_2fr_1.5fr_1fr_170px] md:items-start'
              >
                <div className='flex items-center gap-3 md:block'>
                  <div className='flex h-16 w-16 items-center justify-center rounded border border-gray-200 bg-gray-50'>
                    <img className='w-10' src={assets.parcel_icon} alt="" />
                  </div>
                  <div className='md:hidden'>
                    <p className='text-xs text-gray-400'>Order</p>
                    <p className='font-medium text-gray-800'>#{order._id?.slice(-6) || index + 1}</p>
                  </div>
                </div>

                <div>
                  <p className='mb-2 text-sm font-semibold text-gray-800'>Items</p>
                  <div className='flex flex-col gap-2'>
                    {orderItems.map((item, itemIndex) => (
                      <div key={`${item._id || item.name}-${item.size}-${itemIndex}`} className='text-sm text-gray-600'>
                        <span className='font-medium text-gray-800'>{item.name}</span>
                        <span className='ml-2 text-gray-500'>x {item.quantity}</span>
                        {item.size && <span className='ml-2 rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs'>{item.size}</span>}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className='mb-2 text-sm font-semibold text-gray-800'>Customer</p>
                  <p className='text-sm font-medium text-gray-700'>{customerName}</p>
                  <p className='mt-1 max-w-sm text-sm leading-6 text-gray-500'>{formatAddress(address) || 'No address provided'}</p>
                  <p className='mt-1 text-sm text-gray-600'>{address.phone || 'No phone'}</p>
                </div>

                <div className='space-y-2 text-sm'>
                  <div>
                    <p className='text-xs text-gray-400'>Amount</p>
                    <p className='font-semibold text-gray-900'>{currency}{order.amount}</p>
                  </div>
                  <div>
                    <p className='text-xs text-gray-400'>Payment</p>
                    <p className='text-gray-700'>{order.paymentMethod || 'COD'}</p>
                  </div>
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${order.payment ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                    {order.payment ? 'Paid' : 'Payment Pending'}
                  </span>
                  <p className='text-xs text-gray-400'>{formatDate(order.date)}</p>
                </div>

                <div>
                  <p className='mb-2 hidden text-xs text-gray-400 md:block'>#{order._id?.slice(-6) || index + 1}</p>
                  <select
                    value={order.status || 'Order Placed'}
                    onChange={(event) => statusHandler(event, order._id)}
                    className='w-full cursor-pointer px-3 py-2 text-sm text-gray-700'
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                  {order.payment && order.refundStatus !== 'succeeded' && (
                    <button onClick={() => refundHandler(order._id)} className='mt-2 w-full border border-red-300 text-red-600 px-3 py-2 text-sm'>Refund</button>
                  )}
                  {order.refundStatus === 'succeeded' && <p className='mt-2 text-xs text-red-600'>Refunded</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  )
}

export default Orders
