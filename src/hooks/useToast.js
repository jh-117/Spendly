import { useState, useCallback } from 'react';

/**
 * Simple toast notification hook.
 * Usage: const { toast, showToast } = useToast();
 * Then render <Toast {...toast} /> in your component.
 */
export function useToast() {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, duration = 2500) => {
    setToast({ message, key: Date.now() });
    setTimeout(() => setToast(null), duration);
  }, []);

  return { toast, showToast };
}
