import { useState, useCallback } from 'react';

/**
 * Хук для обработки ошибок в функциональных компонентах
 * 
 * @example
 * function MyComponent() {
 *   const { error, handleError, clearError } = useErrorBoundary();
 * 
 *   if (error) {
 *     return <ErrorFallback error={error} resetErrorBoundary={clearError} />;
 *   }
 * 
 *   const fetchData = async () => {
 *     try {
 *       const data = await api.get('/data');
 *     } catch (err) {
 *       handleError(err);
 *     }
 *   };
 * }
 */
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
