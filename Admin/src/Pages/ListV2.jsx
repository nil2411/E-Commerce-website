import axios from 'axios'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { backendUrl, currency } from '../constants2'

const productListUrl = (searchValue, categoryValue) => {
  const params = new URLSearchParams({ active: 'all' })
  if (searchValue.trim()) params.set('q', searchValue.trim())
  if (categoryValue) params.set('category', categoryValue)
  return `${backendUrl}/products/list?${params.toString()}`
}

const List = () => {
  const [list, setList] = useState([])
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    let active = true

    axios.get(productListUrl(query, categoryFilter)).then((response) => {
      if (!active) return
      if (response.data.success) {
        setList(response.data.products)
      } else {
        toast.error(response.data.message)
      }
    }).catch((error) => {
      if (!active) return
      console.error(error)
      toast.error(error.message)
    })

    return () => {
      active = false
    }
  }, [categoryFilter, query])

  const editProduct = (product) => {
    navigate('/add', { state: product })
  }

  const removeProduct = async (id) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        toast.error('Authentication token not found')
        return
      }

      if (!window.confirm('Remove this product from the store?')) return

      const response = await axios.delete(`${backendUrl}/products/remove`, {
        headers: { token },
        data: { id }
      })

      if (response.data.success) {
        toast.success(response.data.message)
        setList((current) => current.filter((item) => item._id !== id))
      } else {
        toast.error(response.data.message)
      }
    } catch (error) {
      console.error(error)
      toast.error(error.response?.data?.message || error.message)
    }
  }

  return (
    <>
      <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <p className='text-lg font-semibold'>All Products List</p>
          <p className='text-xs text-gray-500'>Search products, track stock, and edit SKU/inventory quickly.</p>
        </div>
        <form onSubmit={(e) => e.preventDefault()} className='flex flex-col gap-2 sm:flex-row'>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className='min-w-[220px] border px-3 py-2 text-sm'
            placeholder='Search name or SKU'
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className='border px-3 py-2 text-sm'
          >
            <option value=''>All categories</option>
            <option value='Men'>Men</option>
            <option value='Women'>Women</option>
            <option value='Kids'>Kids</option>
          </select>
          <button type='submit' className='bg-black px-4 py-2 text-sm text-white'>
            Search
          </button>
        </form>
      </div>

      <div className='flex flex-col gap-2'>
        <div className='hidden md:grid grid-cols-[0.8fr_2.4fr_1fr_1fr_0.8fr_0.8fr_1.5fr] items-center py-1 px-2 border bg-gray-100 text-sm'>
          <b>Image</b>
          <b>Name</b>
          <b>Category</b>
          <b>SKU</b>
          <b>Stock</b>
          <b>Price</b>
          <b className='text-center'>Action</b>
        </div>

        {list.map((item, index) => (
          <div
            className='grid grid-cols-[1fr_3fr_1fr] md:grid-cols-[0.8fr_2.4fr_1fr_1fr_0.8fr_0.8fr_1.5fr] items-center gap-2 py-2 px-2 border text-sm'
            key={item._id || index}
          >
            <img className='w-12' src={item.images?.[0] || 'default-image-url'} alt={item.name} />
            <div>
              <p>{item.name}</p>
              {item.stock <= 5 && <p className='text-xs text-red-500'>Low stock</p>}
            </div>
            <p>{item.category}</p>
            <p className='break-all text-xs text-gray-600'>{item.sku || '-'}</p>
            <p className={item.stock <= 0 ? 'font-semibold text-red-600' : ''}>{item.stock ?? 0}</p>
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
        ))}

        {list.length === 0 && (
          <div className='border px-3 py-6 text-center text-sm text-gray-500'>
            No products found.
          </div>
        )}
      </div>
    </>
  )
}

export default List
