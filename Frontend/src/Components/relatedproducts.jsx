import React, { useContext, useMemo } from 'react'
import { Shopcontext } from '../../Context/Shopcontext'
import Title from './Title'
import Productitem from './Productitem'
const RelatedProducts = ({category,subcategory}) => {
  const {products} = useContext(Shopcontext)

  const relatedproducts = useMemo(() => {
    if (!products || products.length === 0) return [];

    let prouductcopy = products.slice();
    prouductcopy = prouductcopy.filter((item) => item.category === category);
    prouductcopy = prouductcopy.filter((item) => item.subCategory === subcategory);
    return prouductcopy.slice(0,5);
  }, [products, category, subcategory]);

  return (
    <div className='my-24'>
      <div className='text-center text-3xl py-2'>
        <Title title1={'RELATED'} title2={'PRODUCTS'}/>

      </div>

      <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 gap-y-6'>
        {
          relatedproducts.map((item,index) =>(
            <Productitem key = {index} id = {item._id} name = {item.name} image = {item.images} price = {item.price}/>
          

          ))
        }

      </div>

    </div>
  )
}

export default RelatedProducts