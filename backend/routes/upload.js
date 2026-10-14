const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

let cloudinary = null;
try {
  cloudinary = require('cloudinary').v2;
} catch (e) {
  console.warn('Cloudinary package not yet loaded');
}

const ALLOWED_FOLDERS = ['receipts', 'avatars', 'buses', 'companies', 'ethiotrip'];
const ALLOWED_MIME_PREFIXES = ['data:image/jpeg;base64,', 'data:image/jpg;base64,', 'data:image/png;base64,', 'data:image/webp;base64,'];

router.post('/image', protect, async (req, res) => {
  try {
    const { image, folder } = req.body;
    if (!image || typeof image !== 'string') {
      return res.status(400).json({ success: false, message: 'Valid image data is required' });
    }

    if (image.startsWith('data:')) {
      const isValidMime = ALLOWED_MIME_PREFIXES.some(prefix => image.startsWith(prefix));
      if (!isValidMime) {
        return res.status(400).json({
          success: false,
          message: 'Invalid image format. Allowed formats: JPEG, PNG, WEBP',
        });
      }
    }

    const approximateSizeBytes = (image.length * 3) / 4;
    if (approximateSizeBytes > 5 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: 'Image size exceeds maximum allowed limit of 5MB',
      });
    }

    const safeFolder = ALLOWED_FOLDERS.includes(folder) ? folder : 'receipts';
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (cloudinary && cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
      });

      const result = await cloudinary.uploader.upload(image, {
        folder: `ethiotrip/${safeFolder}`,
        resource_type: 'image',
      });

      return res.json({
        success: true,
        url: result.secure_url || result.url,
        public_id: result.public_id,
        provider: 'cloudinary',
      });
    }

    return res.json({
      success: true,
      url: image,
      provider: 'data_uri',
      message: 'Image processed successfully',
    });
  } catch (error) {
    console.error('Image upload error:', error);
    return res.status(500).json({ success: false, message: 'Failed to upload image' });
  }
});

module.exports = router;
