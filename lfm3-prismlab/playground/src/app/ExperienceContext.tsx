import React, { createContext, useContext, useState } from 'react';
import { CanonicalModelId } from '../data/models.ts';

interface ExperienceState {
  selectedModelId: CanonicalModelId;
  setSelectedModelId: (id: CanonicalModelId) => void;
  videoEnabled: boolean;
  setVideoEnabled: (enabled: boolean) => void;
}

const ExperienceContext = createContext<ExperienceState | null>(null);

export const ExperienceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedModelId, setSelectedModelId] = useState<CanonicalModelId>('text');
  const [videoEnabled, setVideoEnabledState] = useState(() => localStorage.getItem('prismlab_background_motion') !== 'off');
  const setVideoEnabled = (enabled: boolean) => {
    localStorage.setItem('prismlab_background_motion', enabled ? 'on' : 'off');
    setVideoEnabledState(enabled);
  };
  return <ExperienceContext.Provider value={{ selectedModelId, setSelectedModelId, videoEnabled, setVideoEnabled }}>{children}</ExperienceContext.Provider>;
};

export const useExperience = () => {
  const state = useContext(ExperienceContext);
  if (!state) throw new Error('ExperienceProvider is missing');
  return state;
};
