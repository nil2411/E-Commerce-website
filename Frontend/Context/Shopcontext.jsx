/* eslint react-refresh/only-export-components: off */
import { createContext, useCallback, useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom";

import { toast } from "react-toastify";
import axios from "axios";

// Create the context object
export const Shopcontext = createContext();

const toId = (id) => String(id);

const normalizeCart = (raw) => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out = {};
  for (const [key, sizes] of Object.entries(raw)) {
    if (!sizes || typeof sizes !== "object") continue;
    const cleaned = {};
    for (const [size, qty] of Object.entries(sizes)) {
      const n = Number(qty);
      if (n > 0) cleaned[size] = n;
    }
    if (Object.keys(cleaned).length > 0) {
      out[toId(key)] = cleaned;
    }
  }
  return out;
};

// Context provider component
const ShopContextProvider = (props) => {

  const currency = import.meta.env.VITE_CURRENCY_SYMBOL || "\u20B9";
  const backendUrl = String(import.meta.env.VITE_BACKEND_URL || '').replace(/\/+$/, '')
  const delivery_fee = 10;
  const [search, setsearch] = useState('');
  const [showsearch, setshowsearch] = useState(false);
  const [cartitems, setcartitems] = useState({});
  const [products, setProducts] = useState([])
  const [productsLoading, setProductsLoading] = useState(true);
  const [token, setToken] = useState('');
  const cartLoadId = useRef(0);

  const cartHeaders = (authToken) => ({ headers: { token: authToken } });

  useEffect(() => {
    let cancelled = false

    const fetchProducts = async () => {
      if (!backendUrl) {
        console.warn('VITE_BACKEND_URL is not set; products will stay empty.')
        if (!cancelled) {
          setProducts([])
          setProductsLoading(false)
        }
        return
      }

      if (!cancelled) setProductsLoading(true)
      try {
        const response = await axios.get(`${backendUrl}/products/list`)
        if (cancelled) return
        const data = response.data
        const list = Array.isArray(data?.products) ? data.products : []
        if (data?.success) {
          setProducts(list)
        } else {
          setProducts([])
          if (data?.message) toast.error(data.message)
        }
      } catch (error) {
        if (!cancelled) {
          console.error(error)
          setProducts([])
          toast.error(error?.message || 'Failed to load products')
        }
      } finally {
        if (!cancelled) setProductsLoading(false)
      }
    }

    fetchProducts()
    return () => {
      cancelled = true
    }
  }, [backendUrl])

  const navigate = useNavigate();

  const getUserCart = useCallback(async (authToken, { silent = false } = {}) => {
    if (!backendUrl || !authToken) return false;
    const loadId = ++cartLoadId.current;
    try {
      const response = await axios.post(
        `${backendUrl}/cart/get`,
        {},
        cartHeaders(authToken)
      );
      if (cartLoadId.current !== loadId) return false;
      if (response.data.success) {
        setcartitems(normalizeCart(response.data.cartData ?? response.data.message));
        return true;
      }
      if (!silent) toast.error(response.data.message || 'Failed to load cart');
      return false;
    } catch (error) {
      if (cartLoadId.current === loadId) {
        console.log(error);
        if (!silent) toast.error(error?.response?.data?.message || error?.message || 'Failed to load cart');
      }
      return false;
    }
  }, [backendUrl]);

  const applyLocalCartAdd = (itemId, size) => {
    const id = toId(itemId);
    const cartdata = structuredClone(cartitems);
    if (cartdata[id]) {
      if (cartdata[id][size]) {
        cartdata[id][size]++;
      } else {
        cartdata[id][size] = 1;
      }
    } else {
      cartdata[id] = {};
      cartdata[id][size] = 1;
    }
    setcartitems(cartdata);
  };

  const addtocart = async (itemId, size) => {
    if (!size) {
      toast.error("Please select a size");
      return;
    }

    const productId = toId(itemId);

    if (token && backendUrl) {
      cartLoadId.current += 1;
      try {
        const response = await axios.post(
          `${backendUrl}/cart/add`,
          { itemId: productId, size },
          cartHeaders(token)
        );
        if (response.data.success) {
          setcartitems(normalizeCart(response.data.cartData));
        } else {
          toast.error(response.data.message || 'Failed to add to cart');
          await getUserCart(token, { silent: true });
        }
      } catch (error) {
        console.log(error);
        toast.error(error?.response?.data?.message || error.message);
        await getUserCart(token, { silent: true });
      }
      return;
    }

    applyLocalCartAdd(productId, size);
  };

  const getcartcount = () => {
    let totalcount = 0;

    for (const item in cartitems) {
      for (const size in cartitems[item]) {
        if (cartitems[item][size] > 0) {
          totalcount += cartitems[item][size];
        }
      }
    }
    return totalcount;
  }

  const updateQuantity = async (itemId, size, quantity) => {
    const productId = toId(itemId);
    const qty = Number(quantity);

    if (token && backendUrl) {
      cartLoadId.current += 1;
      try {
        const response = await axios.post(
          `${backendUrl}/cart/update`,
          { itemId: productId, size, quantity: qty },
          cartHeaders(token)
        );
        if (response.data.success) {
          setcartitems(normalizeCart(response.data.cartData));
        } else {
          toast.error(response.data.message || 'Failed to update cart');
          await getUserCart(token, { silent: true });
        }
      } catch (error) {
        console.log(error);
        toast.error(error?.response?.data?.message || error.message);
        await getUserCart(token, { silent: true });
      }
      return;
    }

    const cartdata = structuredClone(cartitems);
    if (!cartdata[productId]) cartdata[productId] = {};
    if (qty <= 0) {
      delete cartdata[productId][size];
      if (Object.keys(cartdata[productId]).length === 0) delete cartdata[productId];
    } else {
      cartdata[productId][size] = qty;
    }
    setcartitems(cartdata);
  }

  const getcartamount = () => {
    let totalamount = 0;

    for (const items in cartitems) {
      const iteminfo = products.find((product) => toId(product._id) === toId(items));
      if (!iteminfo) continue;
      for (const item in cartitems[items]) {
        if (cartitems[items][item] > 0) {
          totalamount += iteminfo.price * cartitems[items][item];
        }
      }
    }

    return totalamount;
  }

  const getProductsData = async () => {
    if (!backendUrl) {
      toast.error('VITE_BACKEND_URL is not set')
      setProducts([])
      return
    }
    setProductsLoading(true)
    try {
      const response = await axios.get(`${backendUrl}/products/list`)
      const data = response.data
      if (data.success) {
        setProducts(Array.isArray(data.products) ? data.products : [])
      } else {
        setProducts([])
        toast.error(data.message || 'Failed to load products')
      }
    } catch (error) {
      console.log(error)
      setProducts([])
      toast.error(error.message)
    } finally {
      setProductsLoading(false)
    }
  }

  useEffect(() => {
    const stored = localStorage.getItem('token');
    if (stored) {
      setToken(stored);
      return;
    }
    if (!backendUrl) return;
    axios.post(`${backendUrl}/user/refresh`).then((response) => {
      if (response.data.success && response.data.token) {
        localStorage.setItem('token', response.data.token);
        setToken(response.data.token);
      }
    }).catch(() => {});
  }, [backendUrl]);

  useEffect(() => {
    if (!backendUrl) return undefined;
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const request = error.config;
        const isAuthRequest = request?.url?.includes('/user/login') || request?.url?.includes('/user/refresh');
        if (error.response?.status !== 401 || request?._retried || isAuthRequest) return Promise.reject(error);

        request._retried = true;
        try {
          const response = await axios.post(`${backendUrl}/user/refresh`);
          const nextToken = response.data.token;
          localStorage.setItem('token', nextToken);
          setToken(nextToken);
          request.headers = { ...request.headers, token: nextToken, Authorization: `Bearer ${nextToken}` };
          return axios(request);
        } catch (refreshError) {
          localStorage.removeItem('token');
          setToken('');
          return Promise.reject(refreshError);
        }
      }
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, [backendUrl]);

  const logout = async () => {
    if (backendUrl) await axios.post(`${backendUrl}/user/logout`).catch(() => {});
    localStorage.removeItem('token');
    setToken('');
    setcartitems({});
    navigate('/login');
  };

  useEffect(() => {
    if (!token) {
      setcartitems({});
      return;
    }
    if (!backendUrl) return;

    const loadId = ++cartLoadId.current;
    const loadCart = async () => {
      try {
        const response = await axios.post(
          `${backendUrl}/cart/get`,
          {},
          cartHeaders(token)
        );
        if (cartLoadId.current !== loadId) return;
        if (response.data.success) {
          setcartitems(normalizeCart(response.data.cartData ?? response.data.message));
        } else {
          console.warn('Cart load failed:', response.data.message);
        }
      } catch (error) {
        if (cartLoadId.current === loadId) {
          console.error('Cart load error:', error?.response?.data || error.message);
        }
      }
    };
    loadCart();
  }, [token, backendUrl]);

  const value = {
    products,
    productsLoading,
    currency,
    delivery_fee,
    search,
    setsearch,
    showsearch,
    setshowsearch,
    addtocart,
    getcartcount,
    cartitems,
    updateQuantity,
    getcartamount,
    navigate,
    getProductsData,
    getUserCart,
    setToken,
    logout,
    setcartitems,
    token,
    backendUrl
  };

  return (
    <Shopcontext.Provider value={value}>
      {props.children}
    </Shopcontext.Provider>
  );
};

export default ShopContextProvider;
