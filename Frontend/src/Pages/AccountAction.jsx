import React, { useContext, useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { Shopcontext } from '../../Context/Shopcontext'

const AccountAction = ({ mode }) => {
  const { backendUrl, navigate } = useContext(Shopcontext)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const token = new URLSearchParams(window.location.search).get('token')

  useEffect(() => {
    if (mode !== 'verify' || !token) return
    axios.post(`${backendUrl}/user/verify-email`, { token }).then((response) => {
      setMessage(response.data.message)
      toast.success(response.data.message)
    }).catch((error) => setMessage(error.response?.data?.message || error.message))
  }, [backendUrl, mode, token])

  const submit = async (event) => {
    event.preventDefault()
    try {
      const endpoint = mode === 'forgot' ? 'forgot-password' : 'reset-password'
      const response = await axios.post(`${backendUrl}/user/${endpoint}`, mode === 'forgot' ? { email } : { token, password })
      setMessage(response.data.message)
      toast.success(response.data.message)
      if (mode === 'reset') setTimeout(() => navigate('/login'), 1200)
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    }
  }

  if (mode === 'verify') return <div className='border-t py-20 text-center'><h1 className='text-2xl mb-3'>Email verification</h1><p>{message || 'Verifying...'}</p></div>

  return (
    <form onSubmit={submit} className='border-t py-20 mx-auto max-w-md'>
      <h1 className='text-2xl mb-6'>{mode === 'forgot' ? 'Forgot password' : 'Choose a new password'}</h1>
      {mode === 'forgot' ? (
        <input type='email' value={email} onChange={(e) => setEmail(e.target.value)} className='w-full border px-3 py-3' placeholder='Email address' required />
      ) : (
        <input type='password' value={password} onChange={(e) => setPassword(e.target.value)} className='w-full border px-3 py-3' placeholder='New password' minLength={8} required />
      )}
      <button className='mt-4 w-full bg-black text-white py-3'>{mode === 'forgot' ? 'SEND RESET LINK' : 'RESET PASSWORD'}</button>
      {message && <p className='mt-4 text-sm text-gray-600'>{message}</p>}
    </form>
  )
}

export default AccountAction
