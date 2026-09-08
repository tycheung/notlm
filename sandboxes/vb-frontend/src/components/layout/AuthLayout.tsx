import React from 'react';
import { Link } from 'react-router-dom';
import Logo from '../common/Logo';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen bg-bg flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-4">
          <Logo size="medium" showText={true} linkTo="/" />
        </div>
        
        <h2 className="mt-6 text-center text-3xl font-bold text-primary">
          {title}
        </h2>
        
        {subtitle && (
          <p className="mt-2 text-center text-sm text-text-muted">
            {subtitle}
          </p>
        )}
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-surface border border-border py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {children}
        </div>
        
        <div className="mt-6 text-center">
          {title === 'Login' ? (
            <p className="text-sm text-text-muted">
              Don't have an account?{' '}
              <Link to="/register" className="font-medium text-primary hover:text-text-muted">
                Sign up
              </Link>
            </p>
          ) : (
            <p className="text-sm text-text-muted">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-primary hover:text-text-muted">
                Sign in
              </Link>
            </p>
          )}
          
          {title === 'Login' && (
            <p className="mt-2 text-sm text-text-muted">
              <Link to="/forgot-password" className="font-medium text-primary hover:text-text-muted">
                Forgot your password?
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
