import React, { createContext, useContext, ReactNode } from 'react';

interface PageTreeContextType {
  refreshPageTree: () => void;
  setRefreshFunction: (fn: () => void) => void;
}

const PageTreeContext = createContext<PageTreeContextType | undefined>(undefined);

export const usePageTree = () => {
  const context = useContext(PageTreeContext);
  if (!context) {
    throw new Error('usePageTree must be used within a PageTreeProvider');
  }
  return context;
};

interface PageTreeProviderProps {
  children: ReactNode;
}

export const PageTreeProvider: React.FC<PageTreeProviderProps> = ({ children }) => {
  let refreshFunction: (() => void) | null = null;

  const setRefreshFunction = (fn: () => void) => {
    refreshFunction = fn;
  };

  const refreshPageTree = () => {
    if (refreshFunction) {
      refreshFunction();
    }
  };

  return (
    <PageTreeContext.Provider value={{ refreshPageTree, setRefreshFunction }}>
      {children}
    </PageTreeContext.Provider>
  );
}; 