import React, { useContext, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Shopcontext } from '../../Context/Shopcontext';
import { assets } from '../assets/assets';
import Relatedproducts from '../Components/relatedproducts';

const Product = () => {

  const { productId } = useParams();
  const { products, currency,addtocart } = useContext(Shopcontext);
  // console.log(productId);

  const productdata = useMemo(() => {
    return products.find((item) => String(item._id) === String(productId));
  }, [products, productId]);

  const [image, setimage] = useState('');
  const [size, setsize] = useState('');

  const displayedImage = productdata?.images?.includes(image) ? image : (productdata?.images?.[0] || '');
  const displayedSize = productdata?.sizes?.includes(size) ? size : '';

  if (!productdata) {
    return (
      <div className="border-t-2 pt-10 min-h-[60vh] flex flex-col items-center justify-center gap-6">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-black rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">Loading product...</p>
      </div>
    );
  }

  return (
    <div key={productId} className="border-t-2 pt-10 transition-opacity duration-300 ease-out opacity-100">
      {/* Product Data */}
      <div className='flex gap-12 sm:gap-12 flex-col sm:flex-row'>
        {/* Product Image */}
        <div className='flex-1 flex flex-col-reverse gap-3 sm:flex-row'>
          <div className='flex sm:flex-col overflow-x-auto sm:overflow-y-scroll justify-between sm:justify-normal sm:w-[18.7%] w-full'>
            {
              productdata.images.map((item, index) => (
                <img src={item} alt={`${productdata.name} view ${index + 1}`} loading='lazy' className='w-[24%] sm:w-full sm:mb-3 flex-shrink-0 cursor-pointer' key={index} onClick={() => setimage(item)} />

              ))
            }
          </div>

          <div className='w-full sm:w-[80%]'>
            <img src={displayedImage} alt={productdata.name} className='w-full h-auto' />
          </div>
        </div>

        {/* product info */}

        <div className='flex-1'>
          <h1 className='font-medium text-2xl mt-2'>{productdata.name}</h1>
          <div className='flex items-center gap-1 mt-2'>
            <img src={assets.star_icon} alt="" className="w-3.5" />
            <img src={assets.star_icon} alt="" className="w-3.5" />
            <img src={assets.star_icon} alt="" className="w-3.5" />
            <img src={assets.star_icon} alt="" className="w-3.5" />
            <img src={assets.star_dull_icon} alt="" className="w-3.5" />
            <p className='pl-2'>122</p>

          </div>
          <p className='mt-5 text-3xl font-medium'>{currency}{productdata.price}</p>
          <p className={`mt-2 text-sm ${productdata.stock > 5 ? 'text-green-600' : 'text-amber-600'}`}>
            {productdata.stock > 0 ? `${productdata.stock} in stock` : 'Out of stock'}
          </p>
          <p className='mt-5 text-gray-500 md:w-4/5'>
            {productdata.description}
          </p>

          <div className='flex flex-col gap-4 my-8'>
            <p>Select Size</p>
            <div className='flex gap-2'>
              {
                productdata.sizes.map((item, index) => (
                  <button key={index} className={`cursor-pointer border py-2 px-4 bg-gray-100 ${item === size ? 'border-orange-500' : ''}`} onClick={() => { setsize(item) }}>{item}</button>

                ))
              }

            </div>

          </div>

          <div>
            <button disabled={productdata.stock <= 0} onClick={() => addtocart(String(productdata._id), displayedSize)} className='bg-black disabled:bg-gray-400 text-white px-8 py-3 text-sm active:bg-gray-700 cursor-pointer disabled:cursor-not-allowed'>
              {productdata.stock > 0 ? 'ADD TO CART' : 'OUT OF STOCK'}
            </button>
            <hr className='mt-8 sm:w-4/5' />
            <div className='text-sm text-gray-500 mt-5 flex flex-col gap-1'>
              <p>100% Original Product</p>
              <p>Cash on delivery available</p>
              <p>Easy return and exchange policy within 7 days</p>

            </div>
          </div>

        </div>
      </div>

      {/* Description and review section – below the image + product info row */}
      <div className='mt-20'>
        <div className='flex'>
          <b className='border px-5 py-3 text-sm'>Description</b>
          <p className='border px-5 py-3 text-sm'>Reviews(122)</p>
        </div>

        <div className='flex flex-col gap-4 border px-6 py-6 text-sm text-gray-500'>
          <p>An e-commerce website is an online platform that facilitates the buying and selling of products or services over the internet. It serves as a virtual marketplace where businesses and individuals can
            showcase their products, interact with customers, and conduct transactions without the need for a physical presence. E-commerce websites have gained immense popularity due to their
            convenience, accessibility, and the global reach they offer.</p>

          <p>E-commerce websites typically display products or services along with detailed descriptions, images, prices, and any available variations (e.g., sizes, colors). Each product usually has its own
            dedicated page with relevant information.</p>

        </div>
      </div>

      {/* display related products */}
      <Relatedproducts category = {productdata.category} subcategory = {productdata.subCategory}/>



    </div>
  );
}

export default Product
