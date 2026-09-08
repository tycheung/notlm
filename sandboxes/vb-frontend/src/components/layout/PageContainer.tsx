import React, { ReactNode } from 'react';
import Header from './Header';
import Footer from './Footer';

interface PageContainerProps {
  children: ReactNode;
}

const PageContainer: React.FC<PageContainerProps> = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen bg-bg">
      <Header />
      <main className="flex-grow">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default PageContainer;
