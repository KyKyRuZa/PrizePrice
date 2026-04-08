import { useCallback } from 'react';
import { syncAllUserData, uploadLocalChanges, downloadAndMergeServerData } from '../utils/syncUserData';

const withToken = async ({ token, warning, action, emptyResult }) => {
  if (!token) {
    console.warn(warning);
    return emptyResult;
  }

  return action();
};

/**
 * Custom hook for managing user data synchronization
 */
export const useUserDataSync = () => {
  const syncAllData = useCallback(async (token) => {
    try {
      return await withToken({
        token,
        warning: 'No token provided for syncAllData',
        action: () => syncAllUserData(token),
        emptyResult: null,
      });
    } catch (error) {
      console.error('Error during full data sync:', error);
      throw error;
    }
  }, []);

  const uploadChanges = useCallback(async (token) => {
    try {
      await withToken({
        token,
        warning: 'No token provided for uploadChanges',
        action: () => uploadLocalChanges(token),
        emptyResult: undefined,
      });
    } catch (error) {
      console.error('Error uploading local changes:', error);
      throw error;
    }
  }, []);

  const downloadAndMerge = useCallback(async (token) => {
    try {
      return await withToken({
        token,
        warning: 'No token provided for downloadAndMerge',
        action: () => downloadAndMergeServerData(token),
        emptyResult: null,
      });
    } catch (error) {
      console.error('Error downloading and merging server data:', error);
      throw error;
    }
  }, []);

  return {
    syncAllData,
    uploadChanges,
    downloadAndMerge,
  };
};
