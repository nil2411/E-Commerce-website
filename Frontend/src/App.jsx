import React, { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Home from './Pages/Home'
import Login from './Pages/Login'
import Product from './Pages/Product'
import Orders from './Pages/Orders'
import Collections from './Pages/Collections'
import About from './Pages/About'
import Placeorder from './Pages/PlaceOrder'
import Contact from './Pages/Contact'
import Cart from './Pages/Cart'
import Navbar from './Components/Navbar'
import Footer from '../src/Components/Footer'
import { ToastContainer } from 'react-toastify';
import Profile from './Pages/Profile'
import AccountAction from './Pages/AccountAction'

//import Searchbar from './Components/Searchbar'

const ScrollToTop = () => {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [pathname])

  return null
}

const App = () => {
  return (
    <div className='px-4 sm:px-[5vw] md:px-[7vw] lg:px-[9vw]'>
      <ScrollToTop/>
      <ToastContainer/>
      <Navbar/>
      

      <Routes>
        <Route path='/' element = {<Home/>} />
        <Route path='/login' element = {<Login/>} />
        <Route path='/product/:productId' element = {<Product/>} />
        <Route path='/Orders' element = {<Orders/>} />
        <Route path='/Collections' element = {<Collections/>} />
        <Route path='/About' element = {<About/>} />
        <Route path='/Placeorder' element = {<Placeorder/>} />
        <Route path='/Contact' element = {<Contact/>} />
        <Route path='/Cart' element = {<Cart/>} />
        <Route path='/profile' element={<Profile />} />
        <Route path='/verify-email' element={<AccountAction mode='verify' />} />
        <Route path='/forgot-password' element={<AccountAction mode='forgot' />} />
        <Route path='/reset-password' element={<AccountAction mode='reset' />} />
      </Routes>
      <Footer/>
        

        
        


    </div>
  )
}

export default App
