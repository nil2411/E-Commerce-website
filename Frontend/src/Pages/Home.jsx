import React from 'react'
import Hero from '../Components/Hero'
import LastestCollection from '../Components/LastestCollection'
import BestSeller from '../Components/BestSeller'
import OurPolicy from '../Components/OurPolicy' 
import NewsLetterBox from '../Components/NewsLetterBox'
   

const Home = () => {
  return (
    <div>
     <Hero/>
     <LastestCollection/>
     <BestSeller/>
     <OurPolicy></OurPolicy>
     <NewsLetterBox></NewsLetterBox>
    </div>
  )
}

export default Home