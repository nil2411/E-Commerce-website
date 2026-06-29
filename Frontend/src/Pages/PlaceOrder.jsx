import React, { useContext, useEffect, useState } from 'react'
import { Shopcontext } from '../../Context/Shopcontext';
import Title from '../Components/Title';
import CartTotal from '../Components/CartTotal';
import { assets } from '../assets/assets';
import axios from 'axios';
import { toast } from 'react-toastify';

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const PlaceOrder = () => {
  const {
    navigate,
    backendUrl,
    token,
    cartitems,
    products,
    getcartamount,
    delivery_fee,
    setcartitems
  } = useContext(Shopcontext);
  const [method, setMethod] = useState('cod');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    street: '',
    city: '',
    state: '',
    zipcode: '',
    country: '',
    phone: ''
  });

  useEffect(() => {
    if (!token || !backendUrl) return;
    axios.get(`${backendUrl}/user/profile`, { headers: { token } }).then((response) => {
      const address = response.data.user?.addresses?.[0];
      if (address) setFormData((current) => ({ ...current, ...address }));
    }).catch(() => {});
  }, [backendUrl, token]);

  const onChangeHandler = (event) => {
    const { name, value } = event.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const onSubmitHandler = async (event) => {
    event.preventDefault();

    if (!token) {
      toast.error('Please login to place an order');
      navigate('/login');
      return;
    }

    if (!backendUrl) {
      toast.error('Backend URL is not configured');
      return;
    }

    const orderItems = [];
    for (const productId in cartitems) {
      const product = products.find((item) => String(item._id) === String(productId));
      if (!product) continue;

      for (const size in cartitems[productId]) {
        const quantity = Number(cartitems[productId][size]);
        if (quantity > 0) {
          orderItems.push({
            ...product,
            size,
            quantity
          });
        }
      }
    }

    if (orderItems.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    const orderData = {
      address: formData,
      items: orderItems,
      amount: getcartamount() + delivery_fee
    };

    try {
      let response;
      if (method === 'cod') {
        response = await axios.post(
          `${backendUrl}/order/place`,
          orderData,
          { headers: { token } }
        );
      } else if (method === 'stripe') {
        response = await axios.post(
          `${backendUrl}/order/stripe`,
          orderData,
          { headers: { token } }
        );
      } else if (method === 'razorpay') {
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
          toast.error('Failed to load Razorpay. Please try again.');
          return;
        }

        response = await axios.post(
          `${backendUrl}/order/razorpay`,
          orderData,
          { headers: { token } }
        );

        if (!response.data.success) {
          toast.error(response.data.message || 'Failed to initiate Razorpay payment');
          return;
        }

        const { order, key } = response.data;
        if (!order?.id || !key) {
          toast.error('Invalid Razorpay response from server');
          return;
        }

        const razorpayOptions = {
          key,
          amount: order.amount,
          currency: order.currency,
          name: 'Forever',
          description: 'Order Payment',
          order_id: order.id,
          handler: async (paymentResponse) => {
            try {
              const verifyResponse = await axios.post(
                `${backendUrl}/order/verifyRazorpay`,
                paymentResponse,
                { headers: { token } }
              );

              if (verifyResponse.data.success) {
                setcartitems({});
                const successMessage = verifyResponse.data.receiptNumber
                  ? `Payment successful. Receipt ${verifyResponse.data.receiptNumber} generated.`
                  : (verifyResponse.data.message || 'Payment successful');
                toast.success(successMessage);
                navigate('/orders');
              } else {
                toast.error(verifyResponse.data.message || 'Payment verification failed');
              }
            } catch (error) {
              toast.error(error?.response?.data?.message || error.message);
            }
          },
          prefill: {
            name: `${formData.firstName} ${formData.lastName}`.trim(),
            email: formData.email,
            contact: formData.phone
          },
          theme: { color: '#000000' }
        };

        const razorpay = new window.Razorpay(razorpayOptions);
        razorpay.on('payment.failed', (paymentError) => {
          toast.error(paymentError.error?.description || 'Payment failed');
        });
        razorpay.open();
        return;
      } else {
        toast.error('Please select a valid payment method');
        return;
      }

      if (response.data.success) {
        if (method === 'stripe') {
          if (!response.data.session_url) {
            toast.error('Stripe session URL missing from server response');
            return;
          }
          window.location.replace(response.data.session_url);
          return;
        }
        setcartitems({});
        toast.success(response.data.message || 'Order placed');
        navigate('/orders');
      } else {
        toast.error(response.data.message || 'Failed to place order');
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message);
    }
  };

  return (
    <form onSubmit={onSubmitHandler} className='flex flex-col sm:flex-row justify-between gap-4 pt-5 sm:pt-14 min-h-[80vh] border-t'>
      <div className='flex flex-col gap-4 w-full sm:max-w-[480px]'>
        <div className='text-xl sm:text-2xl my-3'>
          <Title title1={'DELIVERY'} title2={'INFORMATION'} />
        </div>
        <div className='flex gap-3'>
          <input required onChange={onChangeHandler} name='firstName' value={formData.firstName} className='border border-gray-300 rounded py-1.5 px-3.5 w-full' type="text" placeholder='First name' />
          <input required onChange={onChangeHandler} name='lastName' value={formData.lastName} className='border border-gray-300 rounded py-1.5 px-3.5 w-full' type="text" placeholder='Last name' />
        </div>
        <input required onChange={onChangeHandler} name='email' value={formData.email} className='border border-gray-300 rounded py-1.5 px-3.5 w-full' type="email" placeholder='Email address' />
        <input required onChange={onChangeHandler} name='street' value={formData.street} className='border border-gray-300 rounded py-1.5 px-3.5 w-full' type="text" placeholder='Street' />
        <div className='flex gap-3'>
          <input required onChange={onChangeHandler} name='city' value={formData.city} className='border border-gray-300 rounded py-1.5 px-3.5 w-full' type="text" placeholder='City' />
          <input required onChange={onChangeHandler} name='state' value={formData.state} className='border border-gray-300 rounded py-1.5 px-3.5 w-full' type="text" placeholder='State' />
        </div>
        <div className='flex gap-3'>
          <input required onChange={onChangeHandler} name='zipcode' value={formData.zipcode} className='border border-gray-300 rounded py-1.5 px-3.5 w-full' type="number" placeholder='Zipcode' />
          <input required onChange={onChangeHandler} name='country' value={formData.country} className='border border-gray-300 rounded py-1.5 px-3.5 w-full' type="text" placeholder='Country' />
        </div>
        <input required onChange={onChangeHandler} name='phone' value={formData.phone} className='border border-gray-300 rounded py-1.5 px-3.5 w-full' type="number" placeholder='Phone' />
      </div>
      <div className='mt-8'>
        <div className='mt-8 min-w-80'>
          <CartTotal />
        </div>
        <div className='mt-12'>
          <Title title1={'PAYMENT'} title2={'METHOD'} />
          <div className='flex gap-3 flex-col lg:flex-row'>
            <div onClick={() => setMethod('stripe')} className='flex items-center gap-3 border p-2 px-3 cursor-pointer'>
              <p className={`min-w-3.5 h-3.5 border rounded-full ${method === 'stripe' ? 'bg-green-400' : ''}`}></p>
              <img className={`h-5 mx-4`} src={assets.stripe_logo} alt="Stripe" />
            </div>
            <div onClick={() => setMethod('razorpay')} className='flex items-center gap-3 border p-2 px-3 cursor-pointer'>
              <p className={`min-w-3.5 h-3.5 border rounded-full ${method === 'razorpay' ? 'bg-green-400' : ''}`} ></p>
              <img className={`h-5 mx-4`} src={assets.razorpay_logo} alt="Razorpay" />
            </div>
            <div onClick={() => setMethod('cod')} className='flex items-center gap-3 border p-2 px-3 cursor-pointer'>
              <p className={`min-w-3.5 h-3.5 border rounded-full ${method === 'cod' ? 'bg-green-400' : ''}`}></p>
              <p className='text-gray-500 text-sm font-medium mx-4'>CASH ON DELIVERY</p>

              
 
            </div>
          </div>
          <div className='w-full text-end mt-8'>
            <button type='submit' className='bg-black text-white px-16 py-3 text-sm cursor-pointer'>PLACE ORDER</button>
          </div>
        </div>
      </div>
    </form> 
  );


}

export default PlaceOrder
