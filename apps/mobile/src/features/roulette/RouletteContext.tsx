import { createContext, useContext, useState, type PropsWithChildren } from 'react';

export type Candidate = { id: number; name: string };

const RouletteContext = createContext<{
  candidates: Candidate[];
  toggleCandidate: (candidate: Candidate) => void;
  removeCandidate: (id: number) => void;
} | null>(null);

export function RouletteProvider({ children }: PropsWithChildren) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const toggleCandidate = (candidate: Candidate) => setCandidates((current) =>
    current.some((item) => item.id === candidate.id)
      ? current.filter((item) => item.id !== candidate.id)
      : current.length < 8 ? [...current, candidate] : current);
  const removeCandidate = (id: number) => setCandidates((current) => current.filter((item) => item.id !== id));
  return <RouletteContext.Provider value={{ candidates, toggleCandidate, removeCandidate }}>{children}</RouletteContext.Provider>;
}

export function useRoulette() {
  const context = useContext(RouletteContext);
  if (!context) throw new Error('RouletteProvider 안에서만 사용할 수 있습니다.');
  return context;
}
