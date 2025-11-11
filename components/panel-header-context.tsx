import React from 'react';

export interface PanelHeaderActionsContextValue {
  setHeaderActions: (actions: React.ReactNode) => void;
}

export const PanelHeaderActionsContext =
  React.createContext<PanelHeaderActionsContextValue | null>(null);

export const usePanelHeaderActions = () => {
  return React.useContext(PanelHeaderActionsContext);
};

