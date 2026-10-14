const PlatformSetting = require('../models/PlatformSetting');
const AuditLog = require('../models/AuditLog');
const { shortName } = require('../constants/branding');

const getSettings = async () => {
  let settings = await PlatformSetting.findOne();
  if (!settings) {
    settings = await PlatformSetting.create({
      systemName: shortName(),
      supportEmail: 'support@ethiotrip.et',
      supportPhone: '+251 911 002 233',
      systemAddress: 'Emare ICT Hub, Debre Birhan, Ethiopia',
      commissionRate: 5.0,
      currency: 'ETB',
      maintenanceMode: false,
      allowNewRegistrations: true,
      maxLoginAttempts: 5,
      sessionTimeoutMinutes: 60,
      cities: ['Addis Ababa', 'Dire Dawa', 'Mekelle', 'Hawassa', 'Bahir Dar', 'Jimma', 'Adama', 'Gondar', 'Dessie', 'Jijiga', 'Arba Minch', 'Shashamane', 'Harar'],
    });
  }
  return settings;
};

const updateSettings = async (updateData, user) => {
  let settings = await PlatformSetting.findOne();
  if (!settings) {
    settings = new PlatformSetting();
  }

  const isSuperAdmin = user?.role === 'super_admin';
  const allowedFields = isSuperAdmin
    ? [
        'systemName',
        'supportEmail',
        'supportPhone',
        'systemAddress',
        'commissionRate',
        'currency',
        'maintenanceMode',
        'allowNewRegistrations',
        'maxLoginAttempts',
        'sessionTimeoutMinutes',
        'cities',
      ]
    : ['cities'];

  allowedFields.forEach((field) => {
    if (updateData[field] !== undefined) {
      settings[field] = updateData[field];
    }
  });

  if (isSuperAdmin && user) {
    settings.updatedBy = user._id;
  }

  await settings.save();

  if (isSuperAdmin && user) {
    await AuditLog.create({
      user: user._id,
      userEmail: user.email,
      userRole: user.role,
      action: 'PLATFORM_SETTINGS_UPDATED',
      entityType: 'PlatformSetting',
      entityId: settings._id.toString(),
      details: updateData,
    }).catch(() => {});
  }

  return settings;
};

module.exports = {
  getSettings,
  updateSettings,
};
