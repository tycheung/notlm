import { useState, useCallback } from 'react';

interface Position {
  latitude: number;
  longitude: number;
}

interface GeolocationHook {
  position: Position | null;
  getPosition: () => Promise<Position>;
  positionError: GeolocationPositionError | null;
  loading: boolean;
}

export const useGeolocation = (): GeolocationHook => {
  const [position, setPosition] = useState<Position | null>(null);
  const [positionError, setPositionError] = useState<GeolocationPositionError | null>(null);
  const [loading, setLoading] = useState(false);

  const getPosition = useCallback((): Promise<Position> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const error = new Error('Geolocation is not supported by your browser') as any;
        setPositionError(error);
        reject(error);
        return;
      }

      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          setPosition(pos);
          setPositionError(null);
          setLoading(false);
          resolve(pos);
        },
        (error) => {
          setPositionError(error);
          setLoading(false);
          reject(error);
        },
        { 
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  }, []);

  return { position, getPosition, positionError, loading };
}; 