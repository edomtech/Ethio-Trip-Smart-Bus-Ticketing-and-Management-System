
const PLATFORM = Object.freeze({
  NAME: 'Ethio Trip',
  TAGLINE: 'Smart Multi-Operator Bus Ticketing and Management System',
  
  EMAIL_DISPLAY_NAME: 'Ethio Trip',
  
  FALLBACK_SENDER: 'no-reply@ethiotrip.com',
  
  STORAGE: Object.freeze({
    TOKEN: 'ethiotrip_token',
    USER: 'ethiotrip_user',
    LANGUAGE: 'ethiotrip_language',
    THEME: 'ethiotrip_theme',
  }),
});


const fullName = () => `${PLATFORM.NAME} — ${PLATFORM.TAGLINE}`;


const shortName = () => `${PLATFORM.NAME} - Smart Bus Ticketing System`;

module.exports = {
  PLATFORM,
  fullName,
  shortName,
};