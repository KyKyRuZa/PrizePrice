import { useState } from 'react';

export function useApiHandler(onSuccess, options = {}) {
  const {
    clearErrors = [],
    validate,
    onFinally,
    setError: externalSetError,
  } = options;

  const [isLoading, setIsLoading] = useState(false);

  const handler = async (event, ...extraArgs) => {
    if (event?.preventDefault) event.preventDefault();

    clearErrors.forEach(setter => setter(''));
    if (externalSetError) externalSetError('');

    if (validate) {
      const validationResult = await validate(...extraArgs);
      if (validationResult !== true) return;
    }

    setIsLoading(true);
    try {
      const result = await onSuccess(...extraArgs);
      if (onSuccess) onSuccess(result, ...extraArgs);
      return result;
    } catch (err) {
      return { error: err };
    } finally {
      setIsLoading(false);
      if (onFinally) onFinally();
    }
  };

  return [handler, isLoading, setIsLoading];
}

export function useAuthApiHandler(authContext, options = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const { setError, clearErrors = [], validate, onSuccess, onFinally } = options;

  const handler = async (event, apiCall, ...args) => {
    if (event?.preventDefault) event.preventDefault();

    clearErrors.forEach(fn => fn(''));
    if (setError) setError('');

    if (validate) {
      const validationResult = await validate(...args);
      if (validationResult !== true) return;
    }

    setIsLoading(true);
    try {
      const result = await apiCall(...args);
      if (onSuccess) onSuccess(result);
      return result;
    } catch (err) {
      return { error: err };
    } finally {
      setIsLoading(false);
      if (onFinally) onFinally();
    }
  };

  return [handler, isLoading, setIsLoading];
}
