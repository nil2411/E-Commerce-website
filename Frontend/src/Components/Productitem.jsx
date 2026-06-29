import React, { useContext } from 'react'
import { Shopcontext } from '../../Context/Shopcontext'
import { Link } from 'react-router-dom';

const Productitem = ({ id, image, name, price }) => {
    const { currency } = useContext(Shopcontext);
    const imageSrc = Array.isArray(image) ? image[0] : image;

    return (
        <Link className='text-gray-700 cursor-pointer' to={`/product/${id}`}>
            <div className='overflow-hidden'>
                <img loading='lazy' src={imageSrc || ''} alt={name || 'product image'} className='hover:scale-110 transition ease-in-out' />
            </div>
            <p className='pt-3 pb-1 text-sm'>{name}</p>
            <p className='text-sm font-medium'>{currency}{price}</p>

        </Link>

    )
}

export default Productitem
