import React from 'react'
import {assets} from '../assets/assets'

const OurPolicy = () => {
  return (
    <div className='flex flex-col sm:flex-row justify-around gap-12 sm:gap-2 text-center py-20 text-xs sm:text-sm md:text-base text-gray-700 '>
      <div>
        <img src= {assets.exchange_icon} alt="" className='m-auto mb-5 w-12'/>
        <p className='font-semibold'>Exchange</p>
        <p className='text-gray-700'>We offer hassle free exchange</p>
      </div>
      <div>
        <img src= {assets.quality_icon} alt="" className='m-auto mb-5 w-12'/>
        <p className='font-semibold'>7 days return policy</p>
        <p className='text-gray-700'>We provide 7 days free return policy</p>
      </div>
      <div>
        <img src= {assets.support_img} alt="" className='m-auto mb-5 w-12'/>
        <p className='font-semibold'>Best customer suppport</p>
        <p className='text-gray-700'>We provide 24/7 customer suppport</p>
      </div>
        

    </div>
  )
}

export default OurPolicy