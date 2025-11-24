import React from 'react';
import { useAuth } from '../context/SimpleAuthContext';
import { useNavigate } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-lg border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            {/* Logo and Title */}
            <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
              <div className="h-8 w-8 sm:h-10 sm:w-10 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="h-4 w-4 sm:h-6 sm:w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h1 className="text-sm sm:text-xl font-bold bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent truncate">
                <span className="hidden sm:inline">Virtual Queue Management</span>
                <span className="sm:hidden">VQM</span>
              </h1>
            </div>
            
            {/* User Info and Actions */}
            <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
              {/* User Info - Hidden on very small screens, compact on mobile */}
              <div className="hidden xs:flex flex-col text-right">
                <span className="text-xs sm:text-sm font-semibold text-gray-900 truncate max-w-20 sm:max-w-none">
                  {profile && 'first_name' in profile && 'last_name' in profile
                    ? `${profile.first_name}${profile.last_name ? ` ${profile.last_name}` : ''}`
                    : user?.email}
                </span>
                <span className="text-xs text-gray-600 capitalize flex items-center justify-end">
                  <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full mr-1 sm:mr-2 ${
                    user?.role === 'doctor' ? 'bg-blue-500' : 'bg-emerald-500'
                  }`}></div>
                  <span className="truncate">
                    {user?.role}
                    <span className="hidden sm:inline">
                      {profile && 'specialization' in profile && ` - ${profile.specialization}`}
                    </span>
                  </span>
                </span>
              </div>
              
              {/* Home Button */}
              <button
                onClick={handleGoHome}
                className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 active:from-purple-700 active:to-purple-800 text-white px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 touch-manipulation"
              >
                <svg className="h-3 w-3 sm:h-4 sm:w-4 inline sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span className="hidden sm:inline">Home</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-3 sm:py-6 px-0 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;