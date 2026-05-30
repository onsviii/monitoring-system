import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

export default function Footer() {
  const location = useLocation();
  const navigate = useNavigate();
  const isLoginPage = location.pathname === '/login';

  const handleScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    if (location.pathname === '/') {
      e.preventDefault();
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      // If we are not on the landing page, we navigate to "/" with the hash.
      // After navigation, the Landing page component can handle scrolling.
      e.preventDefault();
      navigate(`/#${id}`);
      // Fallback scroll on next tick in case navigation is instant
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  };

  if (isLoginPage) {
    return null;
  }

  return (
    <footer id="app-footer" className="bg-gray-900 text-gray-400 py-12 border-t border-gray-800 w-full mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center space-x-3">
          <span className="text-lg font-bold text-white tracking-wide">
            SmartBiz
          </span>
        </div>
        
        <p className="text-sm text-center md:text-left">
          © {new Date().getFullYear()} SmartBiz Competitive Intelligence. Усі права захищено.
        </p>
        
        <div className="flex flex-wrap justify-center gap-6 text-sm">
          <Link to="/" className="hover:text-white transition-colors">
            Головна
          </Link>
          <a 
            href="#how-it-works" 
            onClick={(e) => handleScrollTo(e, 'how-it-works')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Як працює
          </a>
          <a 
            href="#features-section" 
            onClick={(e) => handleScrollTo(e, 'features-section')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Можливості
          </a>
        </div>
      </div>
    </footer>
  );
}
