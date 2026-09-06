/**
 * Upload image to Cloudinary via backend API or fallback safely
 * Supports file object, blob, or data URL
 * @param {File|Blob|string} fileOrData
 * @param {string} folder - Optional Cloudinary folder e.g. 'profiles', 'companies', 'buses'
 * @returns {Promise<string>} - Returns image URL (Cloudinary https URL or robust data URL)
 */
export const uploadToCloudinary = async (fileOrData, folder = 'general') => {
  if (!fileOrData) return '';

  // If already a remote URL, return it
  if (typeof fileOrData === 'string' && (fileOrData.startsWith('http://') || fileOrData.startsWith('https://'))) {
    return fileOrData;
  }

  // Convert File/Blob to Base64 string first
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
    // Attempt upload through backend Cloudinary endpoint
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/upload/image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: localStorage.getItem('ethiobus_token') ? `Bearer ${localStorage.getItem('ethiobus_token')}` : '',
      },
      body: JSON.stringify({
        image: base64Data,
        folder: `ethiotrip/${folder}`,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.url) {
        return data.url;
      }
    }
  } catch (err) {
    console.warn('[Cloudinary Upload] Falling back to local data format:', err?.message || err);
  }

  // Graceful fallback: return the high quality base64 image data URI directly so it NEVER crashes
  return base64Data;
};

export default uploadToCloudinary;
