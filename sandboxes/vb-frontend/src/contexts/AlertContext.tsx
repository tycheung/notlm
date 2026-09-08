import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import Alert from '../components/common/Alert';

type AlertType = 'success' | 'error' | 'warning' | 'info';

interface AlertContextType {
  showAlert: (message: string, type: AlertType) => void;
  hideAlert: () => void;
  alert: {
    message: string;
    type: AlertType;
    visible: boolean;
  } | null;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [alert, setAlert] = useState<{
    message: string;
    type: AlertType;
    visible: boolean;
  } | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideAlert = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    setAlert(null);
  };

  const showAlert = (message: string, type: AlertType) => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    setAlert({ message, type, visible: true });
    hideTimerRef.current = setTimeout(() => {
      hideAlert();
    }, 5000);
  };

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert, alert }}>
      {children}
      {alert?.visible ? (
        <div
          className="fixed top-4 right-4 z-[2000] w-full max-w-md px-4"
          data-testid="global-alert"
          role="status"
          aria-live="polite"
        >
          <Alert
            variant={alert.type}
            message={alert.message}
            onDismiss={hideAlert}
            className="shadow-lg"
          />
        </div>
      ) : null}
    </AlertContext.Provider>
  );
};

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};
