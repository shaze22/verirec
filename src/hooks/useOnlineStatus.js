import { useState, useEffect, useRef } from 'react';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    const handleOnline = () => {
      clearTimeout(debounceRef.current);
      setIsOnline(true);
    };

    const handleOffline = () => {
      debounceRef.current = setTimeout(() => {
        setIsOnline(false);
        setWasOffline(true);
      }, 2000);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearTimeout(debounceRef.current);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, wasOffline };
}
