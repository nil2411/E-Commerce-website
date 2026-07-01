import React, { useEffect, useState } from 'react'
import Navbar from './Components/Navbar'
import Sidebar from './Components/Sidebar'
import { Routes, Route } from 'react-router-dom'
import axios from 'axios'
import Add from './Pages/Add'
import List from './Pages/ListV2'
import Orders from './Pages/Orders'
import Login from './Components/Login'
import Dashboard from './Pages/Dashboard'


const App = () => {

  const [token, setToken] = useState(localStorage.getItem('token')?localStorage.getItem('token'):'');
  
  useEffect(() =>{
    if (token) {
      localStorage.setItem('token',token);
    } else {
      localStorage.removeItem('token');
    }
  },[token]);

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          setToken('');
          error.message = error.response?.data?.message || 'Admin session expired. Please log in again.';
        }
        return Promise.reject(error);
      }
    );

    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  return (
    <div className='bg-gray-50 min-h-screen'>
      {
        token === "" ? <Login setToken={setToken}/> :
          <>
            <Navbar token = {token} setToken={setToken}/>
            <hr />
            <div className='flex w-full'>
              <Sidebar></Sidebar>
              <div className='flex-1 mx-8 my-8 text-gray-600 text-base'>
                <Routes>
                  <Route path='/' element={<Dashboard token={token} />} />
                  <Route path='/dashboard' element={<Dashboard token={token} />} />
                  <Route path='/add' element={<Add token = {token}/>} />
                  <Route path='/list' element={<List token = {token} />} />
                  <Route path='/order' element={<Orders token = {token} />} />
                  <Route path='/login' element={<Login setToken={setToken}/>} />
                </Routes>
              </div>
            </div>
          </>
      }

    </div>
  )
}

export default App
