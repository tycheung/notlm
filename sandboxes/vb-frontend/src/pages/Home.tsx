import React from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/layout/Footer';
import Logo from '../components/common/Logo';
import PageTitle from '../components/common/PageTitle';

const Home: React.FC = () => {
  return (
    <>
      <div className="relative bg-bg">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:py-12 md:py-16">
          {/* Hero Section - More mobile friendly with adjusted spacing */}
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <Logo size="large" showText={false} linkTo="/" />
            </div>
            <PageTitle size="hero" className="md:text-6xl tracking-tight">
              Victory Bowling
            </PageTitle>
            <p className="mt-3 max-w-md mx-auto text-base sm:text-lg md:text-xl text-text-muted sm:mt-5 md:max-w-3xl">
              Manage and participate in bowling tournaments anywhere, anytime
            </p>
            
            <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4">
              <Link
                to="/login"
                className="w-full sm:w-auto inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-bold rounded-md shadow-sm text-text bg-primary hover:bg-primary-light hover:text-text transition duration-150"
              >
                Log In
              </Link>
              <Link
                to="/register"
                className="w-full sm:w-auto inline-flex justify-center items-center px-6 py-3 border border-primary text-base font-bold rounded-md text-primary bg-transparent hover:bg-surface-light transition duration-150"
              >
                Register
              </Link>
            </div>
          </div>
          
          {/* Feature Cards - Stacked on mobile, grid on larger screens */}
          <div className="mt-12 sm:mt-16 md:mt-20 space-y-6 sm:space-y-0 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
            <div className="bg-surface-light p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-primary text-text mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-primary">Join Tournaments</h3>
              <p className="mt-2 text-text-muted">Find and register for bowling tournaments in your area with just a few taps.</p>
            </div>
            
            <div className="bg-surface-light p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-primary text-text mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-primary">Track Performance</h3>
              <p className="mt-2 text-text-muted">Monitor your scores and track your bowling progress on the go.</p>
            </div>
            
            <div className="bg-surface-light p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-primary text-text mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-primary">Win Prizes</h3>
              <p className="mt-2 text-text-muted">Compete for prizes and recognition in bowling tournaments.</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer displayed only on the home page */}
      <Footer />
    </>
  );
};

export default Home; 
