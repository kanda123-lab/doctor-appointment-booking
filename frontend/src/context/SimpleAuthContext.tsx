import React, { createContext, useContext, ReactNode } from 'react';
import { User, Doctor, Patient } from '../types';

interface SimpleAuthContextType {
  user: User | null;
  profile: Doctor | Patient | null;
  isAuthenticated: boolean;
  loading: boolean;
}

const SimpleAuthContext = createContext<SimpleAuthContextType | undefined>(undefined);

interface SimpleAuthProviderProps {
  children: ReactNode;
  user: User;
  profile: Doctor | Patient;
}

export const SimpleAuthProvider: React.FC<SimpleAuthProviderProps> = ({ 
  children, 
  user, 
  profile 
}) => {
  const value = {
    user,
    profile,
    isAuthenticated: true,
    loading: false
  };

  return (
    <SimpleAuthContext.Provider value={value}>
      {children}
    </SimpleAuthContext.Provider>
  );
};

export const useAuth = (): SimpleAuthContextType => {
  const context = useContext(SimpleAuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within a SimpleAuthProvider');
  }
  return context;
};