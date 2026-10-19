
import { storage } from './storage';

export const uploadToCloudinary = async (fileOrData, folder = 'general') => {
  if (!fileOrData) return '';

  if (typeof fileOrData === 'string' && (fileOrData.startsWith('http://') || fileOrData.startsWith('https://'))) {
    return fileOrData;
  }

  let base64Data = '';
  if (typeof fileOrData === 'string' && fileOrData.startsWith('data:image')) {
    base64Data = fileOrData;
  } else if (fileOrData instanceof File || fileOrData instanceof Blob) {
    base64Data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(fileOrData);
    });
  }

  if (!base64Data) {
    throw new Error('Invalid image file or format');
  }

  try {
    const defaultBaseUrl = import.meta.env.DEV
      ? 'http://localhost:5000/api'
      : 'https://ethio-trip-smart-bus-ticketing-and-z9dl.onrender.com/api';
    const apiBase = import.meta.env.VITE_API_URL || defaultBaseUrl;
    const response = await fetch(`${apiBase}/upload/image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        image: base64Data,
        folder,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.url) {
        return data.url;
      }
      console.warn('[Cloudinary Upload] Response contained no url:', data);
    } else {
      const body = await response.text().catch(() => '');
      console.warn(`[Cloudinary Upload] Failed with ${response.status}:`, body.slice(0, 200));
    }
  } catch (err) {
    console.warn('[Cloudinary Upload] Falling back to local data format:', err?.message || err);
  }

  return base64Data;
};

export default uploadToCloudinary;
