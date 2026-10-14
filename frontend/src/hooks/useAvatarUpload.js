import { useState } from 'react';
import { uploadToCloudinary } from '../utils/cloudinary';
import { authAPI } from '../utils/api';
import { storage } from '../utils/storage';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

export function useAvatarUpload() {
  const { user, login } = useAuth();
  const notify = useNotification();
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar || '');

  const handleUpload = async (file) => {
    if (!file) return null;
    try {
      setUploading(true);
      const url = await uploadToCloudinary(file);
      setAvatarUrl(url);

      const currentToken = storage.getToken();
      const updatedUser = await authAPI.updateProfile({ avatar: url });
      login({ ...user, ...updatedUser, avatar: url }, currentToken);

      notify.success({
        title: 'Photo Updated',
        description: 'Your profile photo has been updated successfully.',
      });
      return url;
    } catch (err) {
      notify.notifyError(err, {
        title: 'Upload Failed',
        description: 'Failed to upload profile photo. Please try again.',
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  return {
    uploading,
    avatarUrl,
    handleUpload,
  };
}

export default useAvatarUpload;
