/* eslint react-hooks/set-state-in-effect: off */
import axios from 'axios'
import React from 'react'
import { backendUrl, currency } from '../constants'
import { toast } from 'react-toastify'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const List = () => {
  const [list, setList] = useState([])
  const navigate = useNavigate()
  const fetchList = async()=>{
    try{
      const response = await axios.get(`${backendUrl}/products/list`)
      if(response.data.success){
        setList(response.data.products)
      }
      else{
        toast.error(response.data.message)
      }
    }
    catch (error){
      console.error(error)
      toast.error(error.message)
    }
  }

  useEffect(()=>{
    fetchList()
  }, [])

  // console.log("Fetched Products:", list) 

  const editProduct = (product) => {
    // Reuse /add page for editing by passing the selected product in router state
    navigate('/add', { state: product })
  }

  const removeProduct = async (id) => {
    try {
      const token = localStorage.getItem('token');  // ✅ Fetch token
      if (!token) {
        toast.error('Authentication token not found');
        return;
      }
  
      const response = await axios.delete(
        `${backendUrl}/products/remove`,
        {
          headers: { token },  // ✅ Pass token properly
          data: { id }
        }
      );


  
      if (response.data.success) {
        toast.success(response.data.message);
        await fetchList();
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || error.message);
    }
  };
  
  

  return (
    <>
      <p className='mb-2'>All Products List</p>
      <div className='flex flex-col gap-2'>
        {/*List Table Title */}
        <div className='hidden md:grid grid-cols-[1fr_3fr_1fr_1fr_1fr] items-center py-1 px-2 border bg-gray-100 text-sm'>
          <b>Image</b>
          <b>Name</b>
          <b>Category</b>
          <b>Price</b>
          <b className='text-center'>Action</b>
        </div>

        {/* Product List */}
        {
          list.map((item, index) => (
            <div className='grid grid-cols-[1fr_3fr_1fr] md:grid-cols-[1fr_3fr_1fr_1fr_1fr] items-center gap-2 py-1 px-2 border text-sm' key={index}>
              <img className='w-12' src={item.images?.[0] || 'default-image-url'} alt={item.name} />
              <p>{item.name}</p>
              <p>{item.category}</p>
              <p>{currency}{item.price}</p>
              <div className='flex justify-end md:justify-center gap-2 w-full'>
                <button
                  type='button'
                  onClick={() => editProduct(item)}
                  className='cursor-pointer px-2 py-1 border bg-white hover:bg-gray-50'
                >
                  Edit
                </button>
                <button
                  type='button'
                  onClick={() => removeProduct(item._id)}
                  className='cursor-pointer px-2 py-1 border bg-white hover:bg-gray-50'
                >
                  Remove
                </button>
              </div>
            </div>
          ))
        }
      </div>
    </>
  )
}

export default List;