import { useState, useCallback } from 'react';

export function useErrorBoundary() {
  const [error, setError] = useState(null);

  const handleError = useCallback((err) => {
    console.error('Error caught by useErrorBoundary:', err);
    setError(err);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    handleError,
    clearError,
    hasError: error !== null,
  };
}

export default useErrorBoundary;
