import { useCallback } from 'react';
import { syncAllUserData, uploadLocalChanges, downloadAndMergeServerData } from '../utils/user/syncUserData';

export const useUserDataSync = () => {
  const syncAllData = useCallback(async () => {
    try {
      return await syncAllUserData();
    } catch (error) {
      console.error('Error during full data sync:', error);
      throw error;
    }
  }, []);

  const uploadChanges = useCallback(async () => {
    try {
      await uploadLocalChanges();
    } catch (error) {
      console.error('Error uploading local changes:', error);
      throw error;
    }
  }, []);

  const downloadAndMerge = useCallback(async () => {
    try {
      return await downloadAndMergeServerData();
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
