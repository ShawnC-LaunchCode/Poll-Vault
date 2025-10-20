import { useRef, useCallback } from "react";

export type FlushFunction = () => void;

/**
 * Hook to coordinate saves across multiple components
 * Components can register flush functions that will be called when a manual save is triggered
 */
export function useSaveCoordinator() {
  const flushFunctionsRef = useRef<Map<string, FlushFunction>>(new Map());

  const registerFlush = useCallback((id: string, flushFn: FlushFunction) => {
    flushFunctionsRef.current.set(id, flushFn);

    // Return cleanup function
    return () => {
      flushFunctionsRef.current.delete(id);
    };
  }, []);

  const flushAll = useCallback(() => {
    flushFunctionsRef.current.forEach((flushFn) => {
      try {
        flushFn();
      } catch (error) {
        console.error("Error flushing pending save:", error);
      }
    });
  }, []);

  return {
    registerFlush,
    flushAll,
  };
}
