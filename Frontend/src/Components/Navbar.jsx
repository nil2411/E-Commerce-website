import React, { useContext, useState } from 'react'

import { assets } from '../assets/assets'
import { NavLink, Link } from 'react-router-dom'
import { Shopcontext } from '../../Context/Shopcontext'

const Navbar = () => {
  const [visible, setvisible] = useState(false);
  const {setshowsearch,getcartcount,navigate,token,logout} = useContext(Shopcontext); 
  return (
    <div className=' flex items-center justify-between py-5 font-medium'>
      <Link to='/'><img src={assets.logo} alt="logo" className='w-36' /></Link>

      <ul className='hidden sm:flex gap-5 text-sm text-gray-700'>
        <NavLink to='/' className='flex flex-col items-center gap-1'>
          <p>Home</p>
          <hr className='w-2/4 border-none h-[2px] bg-blackh-[1.5px] bg-gray-700 hidden' />
        </NavLink>
        <NavLink to='/Collections' className='flex flex-col items-center gap-1'>
          <p>Collection</p>
          <hr className='w-2/4 border-none h-[2px] bg-blackh-[1.5px] bg-gray-700 hidden ' />
        </NavLink>
        <NavLink to='/About' className='flex flex-col items-center gap-1'>
          <p>About</p>
          <hr className='w-2/4 border-none h-[2px] h-[1.5px] bg-gray-700 hidden' />
        </NavLink>

        <NavLink to='/Contact' className='flex flex-col items-center gap-1'>
          <p>Contact</p>
          <hr className='w-2/4 border-none h-[2px] bg-blackh-[1.5px] bg-gray-700 hidden' />
        </NavLink>
      </ul>

      <div className='flex items-center gap-6'>
        <img src={assets.search_icon} alt="" className='w-5 cursor-pointer' onClick={()=>setshowsearch((prev) => !prev)}/>

        <div className='group relative'>
          <Link to='/login'><img src={assets.profile_icon} alt="" className='w-5 cursor-pointer' onClick={()=> token ? null : navigate('/login')}/></Link>
         {
          token &&  <div className='group-hover:block hidden absolute dropdown-menu right-0 pt-4'>
          <div className='flex flex-col gap-2 w-36 py-3 bg-slate-100 text-gray-500 rounded items-center'>
            <p onClick={() => navigate('/profile')} className='cursor-pointer hover:text-black'>My Profile</p>
            <p onClick={() => navigate('/orders')} className='cursor-pointer hover:text-black'>Orders</p>
            <p className='cursor-pointer hover:text-black' onClick={logout}>Logout</p>

          </div>

        </div>
         }

        </div>
        <Link to='/cart' className='relative'>
          <img src={assets.cart_icon} alt="" className='w-5 cursor-pointer' />
          <p className='absolute right-[-5px] bottom-[-5px] w-4 text-center leading-4 bg-black text-white aspect-square rounded-full text-[8px]'>{getcartcount()}</p>
        </Link>

        <img onClick={() => setvisible(true)} src={assets.menu_icon} className='w-5 cursor-pointer sm:hidden' alt="" />
      </div>
      {/*sidebar menu for small screens */}
      <div className={`absolute top-0 right-0 bottom-0 overflow-hidden bg-white transition-all ${visible ? 'w-full' : 'w-0'}`}>

        <div className='flex flex-col text-gray-600'>
          <div onClick={() => setvisible(false)} className='flex items-center gap-4 p-3 cursor-pointer'>
            <img className='h-4 rotate-180' src={assets.dropdown_icon} alt="" />
            <p>Back</p>

          </div>
          <NavLink onClick = {() => setvisible(false)} to = '/' className='py-2 pl-6 border'>Home</NavLink>
          <NavLink onClick = {() => setvisible(false)} to = '/Collections' className='py-2 pl-6 border'>Collection</NavLink>
          <NavLink onClick = {() => setvisible(false)} to = '/About' className='py-2 pl-6 border'>About</NavLink>
          <NavLink onClick = {() => setvisible(false)} to = '/Contact' className='py-2 pl-6 border'>Contact</NavLink>

        </div>

      </div>

    </div>

  )
}

export default Navbar
