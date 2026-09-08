import React from 'react';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '../../contexts/AuthContext';

interface LogoutButtonProps {
  variant?: 'icon' | 'button' | 'link';
  className?: string;
}

const LogoutButton: React.FC<LogoutButtonProps> = ({ 
  variant = 'button',
  className = ''
}) => {
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  if (variant === 'icon') {
    return (
      <button 
        onClick={handleLogout}
        className={`text-text-muted hover:text-text transition-colors ${className}`}
        aria-label="Logout"
      >
        <LogoutIcon fontSize="small" />
      </button>
    );
  }

  if (variant === 'link') {
    return (
      <button 
        onClick={handleLogout}
        className={`text-text-muted hover:text-text transition-colors ${className}`}
      >
        Logout
      </button>
    );
  }

  return (
    <button
      onClick={handleLogout}
      className={`flex items-center gap-2 px-4 py-2 bg-surface-light text-text-muted rounded hover:bg-surface-light transition-colors ${className}`}
    >
      <FiLogOut size={18} />
      <span>Logout</span>
    </button>
  );
};

export default LogoutButton; 
