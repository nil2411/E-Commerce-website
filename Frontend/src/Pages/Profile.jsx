import React, { useContext, useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { Shopcontext } from '../../Context/Shopcontext'
import Title from '../Components/Title'

const emptyAddress = {
  firstName: '', lastName: '', email: '', street: '', city: '', state: '', zipcode: '', country: '', phone: ''
}

const Profile = () => {
  const { backendUrl, token, navigate } = useContext(Shopcontext)
  const [form, setForm] = useState({ name: '', phone: '', email: '', emailVerified: false, address: emptyAddress })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) {
      navigate('/login')
      return
    }
    axios.get(`${backendUrl}/user/profile`, { headers: { token } }).then((response) => {
      const user = response.data.user
      setForm({
        name: user.name || '',
        phone: user.phone || '',
        email: user.email || '',
        emailVerified: Boolean(user.emailVerified),
        address: user.addresses?.[0] || { ...emptyAddress, email: user.email || '', phone: user.phone || '' }
      })
    }).catch((error) => toast.error(error.response?.data?.message || error.message)).finally(() => setLoading(false))
  }, [backendUrl, navigate, token])

  const save = async (event) => {
    event.preventDefault()
    try {
      const response = await axios.put(`${backendUrl}/user/profile`, {
        name: form.name,
        phone: form.phone,
        addresses: [form.address]
      }, { headers: { token } })
      toast.success(response.data.message)
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    }
  }

  const changeAddress = (event) => setForm((current) => ({
    ...current,
    address: { ...current.address, [event.target.name]: event.target.value }
  }))

  if (loading) return <p className='border-t py-16 text-gray-500'>Loading profile...</p>

  return (
    <form onSubmit={save} className='border-t py-12 max-w-3xl'>
      <div className='text-2xl mb-8'><Title title1='MY' title2='PROFILE' /></div>
      <div className='grid sm:grid-cols-2 gap-4'>
        <label className='text-sm'>Name<input className='mt-1 w-full border px-3 py-2' value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
        <label className='text-sm'>Phone<input className='mt-1 w-full border px-3 py-2' value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
      </div>
      <p className='mt-4 text-sm'>Email: {form.email} <span className={form.emailVerified ? 'text-green-600' : 'text-amber-600'}>({form.emailVerified ? 'verified' : 'not verified'})</span></p>

      <h2 className='mt-10 mb-4 font-medium'>Default delivery address</h2>
      <div className='grid sm:grid-cols-2 gap-4'>
        {Object.keys(emptyAddress).map((field) => (
          <label key={field} className={`text-sm ${field === 'street' ? 'sm:col-span-2' : ''}`}>
            {field.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase())}
            <input name={field} className='mt-1 w-full border px-3 py-2' value={form.address[field] || ''} onChange={changeAddress} />
          </label>
        ))}
      </div>
      <button className='mt-8 bg-black text-white px-8 py-3'>SAVE PROFILE</button>
    </form>
  )
}

export default Profile

