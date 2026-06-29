import React, { useContext, useMemo, useState } from 'react'
import { Shopcontext } from '../../Context/Shopcontext'
import Title from '../Components/Title'
import { assets } from '../assets/assets';
import CartTotal from '../Components/CartTotal';

const toId = (id) => String(id);

const CartLine = ({ item, productdata, currency, updateQuantity }) => {
  const [qtyInput, setQtyInput] = useState(String(item.quantity));

  const commitQty = () => {
    const val = Number(qtyInput);
    if (Number.isNaN(val) || val <= 0) {
      updateQuantity(item._id, item.size, 0);
    } else if (val !== item.quantity) {
      updateQuantity(item._id, item.size, val);
    } else {
      setQtyInput(String(item.quantity));
    }
  };

  return (
    <div className='py-4 border-t border-b text-gray-700 grid grid-cols-[4fr_0.5fr_0.5fr] sm:grid-cols-[4fr_2fr_0.5fr] items-center gap-4'>
      <div className='flex items-start gap-6'>
        <img src={productdata.images?.[0]} alt="" className='w-16 sm:w-20' />
        <div>
          <p className='text-xs sm:text-lg font-medium'>{productdata.name}</p>
          <div className='flex items-center gap-5 mt-2'>
            <p>{currency}{productdata.price}</p>
            <p className='px-2 sm:px-3 sm:py-1 border'>{item.size}</p>
          </div>
        </div>
      </div>
      <input
        type="number"
        min={1}
        value={qtyInput}
        className='border max-w-10 sm:max-w-20 px-1 sm:px-2 py-1'
        onChange={(e) => setQtyInput(e.target.value)}
        onBlur={commitQty}
        onKeyDown={(e) => e.key === 'Enter' && commitQty()}
      />
      <img
        src={assets.bin_icon}
        alt=""
        className='w-4 mr-4 sm:w-5 cursor-pointer'
        onClick={() => updateQuantity(item._id, item.size, 0)}
      />
    </div>
  );
};

const Cart = () => {
  const { products, cartitems, currency, updateQuantity, navigate } = useContext(Shopcontext);

  const cartdata = useMemo(() => {
    const tempdata = [];
    for (const items in cartitems) {
      for (const item in cartitems[items]) {
        if (cartitems[items][item] > 0) {
          tempdata.push({
            _id: toId(items),
            size: item,
            quantity: cartitems[items][item]
          });
        }
      }
    }
    return tempdata;
  }, [cartitems]);

  return (
    <div className='border-t pt-14'>
      <div className='text-2xl mb-3'>
        <Title title1={'YOUR'} title2={'CART'}></Title>
      </div>

      <div>
        {
          cartdata.map((item) => {
            const productdata = products.find((product) => toId(product._id) === toId(item._id));
            if (!productdata) return null;

            return (
              <CartLine
                key={`${item._id}-${item.size}-${item.quantity}`}
                item={item}
                productdata={productdata}
                currency={currency}
                updateQuantity={updateQuantity}
              />
            );
          })
        }

      </div>
      <div className='flex justify-end m-20'>
        <div className='w-full sm:w-[450px]'>
          <CartTotal />
          <div className='w-full text-end'>
            <button
              className='bg-black text-white text-sm my-8 px-8 py-3 cursor-pointer transition transform active:scale-95 hover:bg-gray-900'
              onClick={() => navigate('/placeOrder')}
            >
              PROCEED TO CHECKOUT
            </button>

          </div>
        </div>


      </div>



    </div>
  )
}

export default Cart
