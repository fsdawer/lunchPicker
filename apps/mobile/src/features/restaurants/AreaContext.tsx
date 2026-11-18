import { createContext, useContext, useState, type PropsWithChildren } from 'react';
import { areas } from './areas';

export type Area = (typeof areas)[number];

const AreaContext = createContext<{
  area: Area;
  setArea: (area: Area) => void;
} | null>(null);

export function AreaProvider({ children }: PropsWithChildren) {
  const [area, setArea] = useState<Area>(areas[0]);
  return <AreaContext.Provider value={{ area, setArea }}>{children}</AreaContext.Provider>;
}

export function useArea() {
  const context = useContext(AreaContext);
  if (!context) throw new Error('AreaProvider 안에서만 useArea를 사용할 수 있습니다.');
  return context;
}
