const platformSettingService = require('../services/platformSettingService');

const getSettings = async (req, res, next) => {
  try {
    const settings = await platformSettingService.getSettings();
    const settingsObj = settings.toObject ? settings.toObject() : settings;
    res.json({ success: true, settings, ...settingsObj });
  } catch (err) {
    next(err);
  }
};

const updateSettings = async (req, res, next) => {
  try {
    const settings = await platformSettingService.updateSettings(req.body, req.user);
    res.json({ success: true, message: 'Platform settings updated successfully', settings });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getSettings,
  updateSettings,
};
