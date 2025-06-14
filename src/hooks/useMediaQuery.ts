import { useEffect, useState } from "react";

export function useMediaQuery(query: string, defaultState = false) {
  const getMatches = (q: string): boolean => {
    if (typeof window !== "undefined") {
      return window.matchMedia(q).matches;
    }
    return defaultState;
  };

  const [matches, setMatches] = useState<boolean>(() => getMatches(query));

  useEffect(() => {
    const mqList = window.matchMedia(query);
    const handleChange = () => setMatches(mqList.matches);
    handleChange();
    mqList.addEventListener("change", handleChange);
    return () => mqList.removeEventListener("change", handleChange);
  }, [query]);

  return matches;
}
