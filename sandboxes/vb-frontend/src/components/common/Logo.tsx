import React from 'react';
import { Link } from 'react-router-dom';

import victoryLogoMark from '../../assets/victory-logo-mark.png';

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: 'small' | 'medium' | 'large';
  linkTo?: string;
}

const Logo: React.FC<LogoProps> = ({
  className = '',
  showText = true,
  size = 'medium',
  linkTo = '/',
}) => {
  const sizeClasses = {
    small: 'h-8 w-8',
    medium: 'h-12 w-12 sm:h-16 sm:w-16',
    large: 'h-28 w-28 sm:h-32 sm:w-32',
  };

  const textSizeClasses = {
    small: 'text-lg sm:text-xl',
    medium: 'text-xl sm:text-2xl',
    large: 'text-3xl sm:text-4xl',
  };

  const LogoContent = () => (
    <div className={`flex items-center gap-3 ${className}`}>
      <img
        src={victoryLogoMark}
        alt="Victory Bowling"
        className={`${sizeClasses[size]} shrink-0 object-contain`}
      />
      {showText && (
        <span className={`font-bold text-text ${textSizeClasses[size]}`}>
          Victory Bowling
        </span>
      )}
    </div>
  );

  if (linkTo) {
    return (
      <Link to={linkTo} className="inline-block">
        <LogoContent />
      </Link>
    );
  }

  return <LogoContent />;
};

export default Logo;
