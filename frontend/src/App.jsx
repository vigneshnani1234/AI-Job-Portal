import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import Index from './pages/Index'
import CheckJobPage from './pages/CheckJobPage'
import Practice from './pages/Practice'
import Course from './pages/Course'
import Welcome from './pages/Welcome' 
import { BrowserRouter, Routes, Route } from 'react-router-dom'

const App = () => {
  return (
    
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Welcome />} />
                <Route path="/index" element={<Index />} />
                <Route path="/check/:jobId" element={<CheckJobPage />} />
                <Route path="/practice" element={<Practice />} />
                <Route path="/course_predict" element={<Course />} />
              </Routes>
            </BrowserRouter>
          
  );
};

export default App;



