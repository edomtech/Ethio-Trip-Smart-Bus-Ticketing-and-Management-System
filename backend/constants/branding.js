
const PLATFORM = Object.freeze({
  NAME: 'Ethio Trip',
  TAGLINE: '',

  EMAIL_DISPLAY_NAME: 'Ethio Trip',

  FALLBACK_SENDER: 'no-reply@ethiotrip.com',

  STORAGE: Object.freeze({
    TOKEN: 'ethiotrip_token',
    USER: 'ethiotrip_user',
    LANGUAGE: 'ethiotrip_language',
    THEME: 'ethiotrip_theme',
  }),
});


const fullName = () => PLATFORM.NAME;


const shortName = () => PLATFORM.NAME;

module.exports = {
  PLATFORM,
  fullName,
  shortName,
};