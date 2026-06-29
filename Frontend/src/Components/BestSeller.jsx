import React, { useContext, useMemo } from 'react'
import { Shopcontext } from '../../Context/Shopcontext'
import Title from './Title'
import Productitem from './Productitem';

const BestSeller = () => {
    const {products} = useContext(Shopcontext);

    const bestSeller = useMemo(() => {
        return products.filter((item) => item.bestseller).slice(0,5);
    }, [products]);
  return (
    <div className='my-10'>
        <div className='text-center text-3xl py-8'>
            <Title title1 = {'BEST'} title2={'SELLERS'}/>
            <p className='w-3/4 m-auto text-xs sm:text-sm md:text-base text-gray-600'>
             Lorem ipsum dolor sit amet consectetur adipisicing elit. Quia, quaerat!
            </p>

        </div>

        <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 gap-y-6'>
          {
            bestSeller.map((item,index) =>(
              <Productitem key = {index} id = {item._id} name = {item.name} image = {item.images} price = {item.price}/>
            ))
          }

        </div>


    </div>
  )
}

export default BestSeller