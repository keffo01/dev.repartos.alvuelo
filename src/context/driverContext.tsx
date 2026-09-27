// src/context/DriverContext.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

interface DriverContextType {
  driver: any;
  setDriver: React.Dispatch<React.SetStateAction<any>>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const DriverContext = createContext<DriverContextType | undefined>(undefined);

export const DriverProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [driver, setDriverState] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Cargar el repartidor guardado al abrir la aplicación
  useEffect(() => {
    const loadStoredDriver = async () => {
      try {
        const storedDriver = await AsyncStorage.getItem('@alvuelo_driver');
        if (storedDriver) {
          setDriverState(JSON.parse(storedDriver));
        }
      } catch (error) {
        console.error('Error al cargar la sesión guardada:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStoredDriver();
  }, []);

  // Función para actualizar el estado y sincronizar con AsyncStorage
  const setDriver = (data: any) => {
    setDriverState((prev: any) => {
      const updatedData = typeof data === 'function' ? data(prev) : data;
      
      if (updatedData) {
        AsyncStorage.setItem('@alvuelo_driver', JSON.stringify(updatedData));
      } else {
        AsyncStorage.removeItem('@alvuelo_driver');
      }
      
      return updatedData;
    });
  };

  // Cerrar sesión
  const logout = async () => {
    await AsyncStorage.removeItem('@alvuelo_driver');
    setDriverState(null);
  };

  return (
    <DriverContext.Provider value={{ driver, setDriver, logout, isLoading }}>
      {children}
    </DriverContext.Provider>
  );
};

export const useDriver = () => {
  const context = useContext(DriverContext);
  if (!context) {
    throw new Error('useDriver debe ser utilizado dentro de un DriverProvider');
  }
  return context;
};