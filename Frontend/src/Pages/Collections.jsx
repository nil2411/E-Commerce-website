import React, { useContext, useMemo, useState } from 'react'
import { Shopcontext } from '../../Context/Shopcontext'
import { assets } from '../assets/assets';
import Title from '../Components/Title';
import Productitem from '../Components/Productitem';
import Searchbar from '../Components/Searchbar';

/** Map common DB / typo variants to the same bucket as filter checkboxes (Men / Women / Kids). */
const CANONICAL_CATEGORY = {
  men: 'men',
  man: 'men',
  mens: 'men',
  male: 'men',
  women: 'women',
  woman: 'women',
  womens: 'women',
  female: 'women',
  kids: 'kids',
  kid: 'kids',
  child: 'kids',
  children: 'kids',
}

const CANONICAL_SUBCATEGORY = {
  topwear: 'topwear',
  'top wear': 'topwear',
  bottomwear: 'bottomwear',
  'bottom wear': 'bottomwear',
  winterwear: 'winterwear',
  'winter wear': 'winterwear',
}

const normStr = (v) => (typeof v === 'string' ? v.trim().toLowerCase() : '')

const canonCat = (n) => (n ? CANONICAL_CATEGORY[n] || n : '')

const canonSub = (n) => (n ? CANONICAL_SUBCATEGORY[n] || n : '')

const productCategoryKey = (item) => {
  const raw = item?.category ?? item?.Category
  return canonCat(normStr(raw))
}

const productSubcategoryKey = (item) => {
  const raw = item?.subCategory ?? item?.subcategory ?? item?.SubCategory
  return canonSub(normStr(raw))
}

/** Name + description (lowercased) for soft category hints when DB `category` is wrong or missing. */
const productSearchText = (item) =>
  `${item?.name || ''} ${item?.description || ''}`.toLowerCase()

/**
 * True if title/description clearly suggests a gender bucket (word-boundary safe;
 * avoids matching "men" inside "women" and "boy" inside "boyfriend").
 */
const textSuggestsCanon = (n, canon) => {
  if (!n || !canon) return false

  if (canon === 'men') {
    if (
      /\bwomen\b|\bwoman\b|\bwomens\b|\bladies\b|\blady\b|\bfemale\b|\bkids\b|\bboys\b|\bgirls\b/.test(
        n
      )
    ) {
      return false
    }
    return /\bmen\b|\bmens\b|\bmale\b|\bman\b/.test(n)
  }

  if (canon === 'women') {
    if (/\bmen\b|\bmens\b|\bmale\b|\bkids\b|\bboys\b|\bgirls\b/.test(n)) {
      return false
    }
    return /\bwomen\b|\bwoman\b|\bwomens\b|\bladies\b|\blady\b|\bfemale\b/.test(n)
  }

  if (canon === 'kids') {
    if (
      /\bmen\b|\bmens\b|\bmale\b|\bwomen\b|\bwoman\b|\bwomens\b|\bladies\b|\bfemale\b/.test(
        n
      )
    ) {
      return false
    }
    return (
      /\bkids\b|\bchild\b|\bchildren\b|\bboys\b|\bgirls\b/.test(n) ||
      /\bboy\b(?!\w*friend)/.test(n) ||
      /\bgirl\b(?!\w*friend)/.test(n)
    )
  }

  return false
}

const productMatchesCategorySet = (item, categorySet) => {
  const key = productCategoryKey(item)
  const text = productSearchText(item)
  for (const c of categorySet) {
    if (key === c) return true
    if (textSuggestsCanon(text, c)) return true
  }
  return false
}

const Collections = () => {
  const { products, productsLoading, search, showsearch, setsearch } =
    useContext(Shopcontext);
  const [showFilter, setshowFilter] = useState(false);
  const [category, setcategory] = useState([]);
  const [subcategory, setsubcategory] = useState([]);
  const [sortType, setsortType] = useState('relevant');

  const onCategoryChange = (value) => (e) => {
    if (e.target.checked) {
      setcategory((prev) => (prev.includes(value) ? prev : [...prev, value]));
    } else {
      setcategory((prev) => prev.filter((item) => item !== value));
    }
  };

  const onSubcategoryChange = (value) => (e) => {
    if (e.target.checked) {
      setsubcategory((prev) => (prev.includes(value) ? prev : [...prev, value]));
    } else {
      setsubcategory((prev) => prev.filter((item) => item !== value));
    }
  };

  const FilterProducts = useMemo(() => {
    const categorySet = new Set(
      category.map((v) => canonCat(normStr(v))).filter(Boolean)
    );
    const subcategorySet = new Set(
      subcategory.map((v) => canonSub(normStr(v))).filter(Boolean)
    );

    const list = Array.isArray(products) ? products : [];
    let productcopy = list.slice();

    if (showsearch && search?.trim()) {
      const q = search.trim().toLowerCase();
      productcopy = productcopy.filter((item) =>
        typeof item.name === 'string' && item.name.toLowerCase().includes(q)
      );
    }

    if (categorySet.size > 0) {
      productcopy = productcopy.filter((item) =>
        productMatchesCategorySet(item, categorySet)
      );
    }

    if (subcategorySet.size > 0) {
      productcopy = productcopy.filter((item) =>
        subcategorySet.has(productSubcategoryKey(item))
      );
    }

    switch (sortType) {
      case 'low-high':
        productcopy.sort((a, b) => a.price - b.price);
        break;
      case 'high-low':
        productcopy.sort((a, b) => b.price - a.price);
        break;
      default:
        // 'relevant' – leave order as is
        break;
    }

    return productcopy;
  }, [products, sortType, category, subcategory, search, showsearch]);

  const productList = Array.isArray(products) ? products : [];
  const hasActiveFilters =
    category.length > 0 ||
    subcategory.length > 0 ||
    (showsearch && Boolean(search?.trim()));

  const clearFilters = () => {
    setcategory([]);
    setsubcategory([]);
    setsearch('');
  };






  return (
    <>
      <Searchbar />
      <div className='flex flex-col sm:flex-row gap-1 sm:gap-10 pt-10 border-t'>

        {/* Filter opeartions */}
        <div className='min-w-60'>
          <button
            type="button"
            className='my-2 text-xl flex items-center cursor-pointer gap-2 w-full text-left sm:cursor-default'
            onClick={() => setshowFilter(!showFilter)}
          >
            FILTERS
            <img
              src={assets.dropdown_icon}
              alt=""
              className={`h-3 sm:hidden ${showFilter ? 'rotate-90' : ''}`}
            />
          </button>
          {/* Category filter */}
          <div className={`border border-gray-300 pl-5 py-3 mt-6 ${showFilter ? '' : 'hidden'} sm:block`}>
            <p className='mb-3 text-sm font-medium'>CATEGORIES</p>
            <div className='flex flex-col gap-2 text-sm font-light text-gray-700'>
              <label className='flex gap-2 items-center cursor-pointer'>
                <input
                  type="checkbox"
                  className='w-3 accent-gray-900'
                  checked={category.includes('Men')}
                  onChange={onCategoryChange('Men')}
                />
                Men
              </label>
              <label className='flex gap-2 items-center cursor-pointer'>
                <input
                  type="checkbox"
                  className='w-3 accent-gray-900'
                  checked={category.includes('Women')}
                  onChange={onCategoryChange('Women')}
                />
                Women
              </label>
              <label className='flex gap-2 items-center cursor-pointer'>
                <input
                  type="checkbox"
                  className='w-3 accent-gray-900'
                  checked={category.includes('Kids')}
                  onChange={onCategoryChange('Kids')}
                />
                Kids
              </label>
            </div>
          </div>

          {/* subcategory filter */}
          <div className={`border border-gray-300 pl-5 py-3 my-5 ${showFilter ? '' : 'hidden'} sm:block`}>
            <p className='mb-3 text-sm font-medium'>TYPE</p>

            <div className='flex flex-col gap-2 text-sm font-light text-gray-700'>
              <label className='flex gap-2 items-center cursor-pointer'>
                <input
                  type="checkbox"
                  className='w-3 accent-gray-900'
                  checked={subcategory.includes('Topwear')}
                  onChange={onSubcategoryChange('Topwear')}
                />
                Topwear
              </label>
              <label className='flex gap-2 items-center cursor-pointer'>
                <input
                  type="checkbox"
                  className='w-3 accent-gray-900'
                  checked={subcategory.includes('Bottomwear')}
                  onChange={onSubcategoryChange('Bottomwear')}
                />
                Bottomwear
              </label>
              <label className='flex gap-2 items-center cursor-pointer'>
                <input
                  type="checkbox"
                  className='w-3 accent-gray-900'
                  checked={subcategory.includes('Winterwear')}
                  onChange={onSubcategoryChange('Winterwear')}
                />
                Winterwear
              </label>
            </div>
          </div>



        </div>

        {/* UI FOR RIGHT SIDE TO DISPLAY PRODUCTS */}
        <div className='flex-1'>
          <div className='flex justify-between text-base sm:text-2xl mb-4'>
            <Title title1={'ALL'} title2={'COLLECTIONS'}></Title>

            {/* Product sort */}
            <select
              className='border-2 border-gray-300 px-2 text-sm'
              value={sortType}
              onChange={(e) => setsortType(e.target.value)}
            >
              <option value="relevant">Sort by : Relevant</option>
              <option value="low-high">Sort by : Low to high</option>
              <option value="high-low">Sort by : High to low</option>
            </select>

          </div>
          {/* MAP ALL PRODUCTS */}
          <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 gap-y-6'>
            {productsLoading ? (
              <p className='col-span-full text-gray-500 text-sm py-10'>
                Loading products…
              </p>
            ) : FilterProducts.length === 0 ? (
              <div className='col-span-full py-10 text-sm text-gray-600 space-y-3'>
                {productList.length === 0 ? (
                  <p>No products available. Check that the backend is running and VITE_BACKEND_URL is set in Frontend/.env</p>
                ) : hasActiveFilters ? (
                  <>
                    <p>No products match your filters.</p>
                    <button
                      type='button'
                      onClick={clearFilters}
                      className='text-black underline underline-offset-2'
                    >
                      Clear filters
                    </button>
                  </>
                ) : (
                  <p>No products to display.</p>
                )}
              </div>
            ) : (
              FilterProducts.map((item) => (
                <Productitem
                  key={item._id}
                  name={item.name}
                  id={item._id}
                  price={item.price}
                  image={item.images}
                />
              ))
            )}
          </div>



        </div>

      </div>
    </>
  )
}

export default Collections