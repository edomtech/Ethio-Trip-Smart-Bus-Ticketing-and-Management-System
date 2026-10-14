'use strict';

const dotenv = require('dotenv');
const scheduleService = require('./scheduleService');
const { getPassengerDbContext } = require('./passengerContextService');

dotenv.config();


const hasValidGeminiKey = (key) => {
  if (!key || typeof key !== 'string') return false;
  const trimmed = key.trim();
  return (
    trimmed.length > 10 &&
    !trimmed.toLowerCase().includes('your_') &&
    !trimmed.toLowerCase().includes('placeholder') &&
    !trimmed.toLowerCase().includes('api_key_here')
  );
};

let geminiClient = null;
let geminiModel = null;

try {
  if (hasValidGeminiKey(process.env.GEMINI_API_KEY)) {
    const { GoogleGenAI } = require('@google/genai');
    geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY.trim() });
    geminiModel = geminiClient.models;
  }
} catch (e) {
  console.warn('[AIService] Gemini SDK initialization note:', e.message);
}


const CITY_MAP = {
  'addis ababa': 'Addis Ababa',
  'addis': 'Addis Ababa',
  'áŠ á‹²áˆµ áŠ á‰ á‰£': 'Addis Ababa',
  'áŠ á‹²áˆµ': 'Addis Ababa',
  'finfinne': 'Addis Ababa',
  'bahir dar': 'Bahir Dar',
  'bahirdar': 'Bahir Dar',
  'á‰£áˆ…áˆ­ á‹³áˆ­': 'Bahir Dar',
  'á‰£áˆ…áˆ­á‹³áˆ­': 'Bahir Dar',
  'hawassa': 'Hawassa',
  'awassa': 'Hawassa',
  'áˆ€á‹‹áˆ³': 'Hawassa',
  'áˆá‹‹áˆ³': 'Hawassa',
  'gondar': 'Gondar',
  'gonder': 'Gondar',
  'áŒŽáŠ•á‹°áˆ­': 'Gondar',
  'mekelle': 'Mekelle',
  'mekele': 'Mekelle',
  'áˆ˜á‰€áˆŒ': 'Mekelle',
  'áˆ˜á‰áˆˆ': 'Mekelle',
  'dire dawa': 'Dire Dawa',
  'diredawa': 'Dire Dawa',
  'á‹µáˆ¬á‹³á‹‹': 'Dire Dawa',
  'á‹µáˆ¬ á‹³á‹‹': 'Dire Dawa',
  'jimma': 'Jimma',
  'áŒ…áˆ›': 'Jimma',
  'dessie': 'Dessie',
  'á‹°áˆ´': 'Dessie',
  'harar': 'Harar',
  'áˆáˆ¨áˆ­': 'Harar',
  'adama': 'Adama',
  'nazret': 'Adama',
  'nazareth': 'Adama',
  'áŠ á‹³áˆ›': 'Adama',
  'áŠ“á‹áˆ¬á‰µ': 'Adama',
  'arba minch': 'Arba Minch',
  'arbaminch': 'Arba Minch',
  'áŠ áˆ­á‰£ áˆáŠ•áŒ­': 'Arba Minch',
  'jijiga': 'Jijiga',
  'áŒ…áŒ…áŒ‹': 'Jijiga',
};


const formatDate = (dateObj) => {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};


const extractSearchParameters = (text) => {
  const lower = text.toLowerCase();
  let origin = null;
  let destination = null;

  const amharicMatch = text.match(/áŠ¨\s*([^\s]+(?:\s+[^\s]+)?)\s*á‹ˆá‹°\s*([^\s]+(?:\s+[^\s]+)?)/i);
  if (amharicMatch) {
    const rawFrom = amharicMatch[1].trim().toLowerCase();
    const rawTo = amharicMatch[2].trim().toLowerCase();
    for (const [key, val] of Object.entries(CITY_MAP)) {
      if (rawFrom.includes(key.toLowerCase())) origin = val;
      if (rawTo.includes(key.toLowerCase())) destination = val;
    }
  }

  if (!origin || !destination) {
    const fromToMatch = lower.match(/from\s+([a-zA-Z\s]+?)\s+to\s+([a-zA-Z\s]+)/i);
    if (fromToMatch) {
      const rawFrom = fromToMatch[1].trim();
      const rawTo = fromToMatch[2].trim();
      for (const [key, val] of Object.entries(CITY_MAP)) {
        if (rawFrom.includes(key)) origin = val;
        if (rawTo.includes(key)) destination = val;
      }
    }
  }

  if (!origin || !destination) {
    const matchedCities = [];
    for (const [key, val] of Object.entries(CITY_MAP)) {
      if (lower.includes(key)) {
        if (!matchedCities.includes(val)) matchedCities.push(val);
      }
    }
    if (matchedCities.length >= 2) {
      origin = matchedCities[0];
      destination = matchedCities[1];
    } else if (matchedCities.length === 1) {
      if (lower.includes('to ') || lower.includes('á‹ˆá‹° ')) {
        destination = matchedCities[0];
      } else {
        origin = matchedCities[0];
      }
    }
  }

  let date = formatDate(new Date());
  if (lower.includes('tomorrow') || lower.includes('áŠáŒˆ')) {
    const tom = new Date();
    tom.setDate(tom.getDate() + 1);
    date = formatDate(tom);
  } else if (lower.includes('day after tomorrow') || lower.includes('áŠ¨áŠáŒˆ á‹ˆá‹²á‹«')) {
    const dat = new Date();
    dat.setDate(dat.getDate() + 2);
    date = formatDate(dat);
  } else {
    const isoDateMatch = text.match(/\b(202\d-[01]\d-[0-3]\d)\b/);
    if (isoDateMatch) {
      date = isoDateMatch[1];
    }
  }

  let passengers = 1;
  const paxMatch = text.match(/(\d+)\s*(?:passenger|passengers|seats|people|áˆ°á‹|á‹ˆáŠ•á‰ áˆ­)/i);
  if (paxMatch) {
    passengers = Math.max(1, Math.min(10, parseInt(paxMatch[1], 10)));
  }

  return { origin, destination, date, passengers };
};


const askAssistant = async (prompt, conversationHistory = [], authenticatedUser = null) => {
  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    const err = new Error('Prompt is required');
    err.statusCode = 400;
    throw err;
  }

  const query = prompt.trim();
  const lower = query.toLowerCase();

  const isAmharic = /[\u1200-\u137F]/.test(query);

  const restrictedKeywords = [
    'delete route', 'delete schedule', 'delete bus', 'delete user',
    'add bus', 'add route', 'create route', 'create schedule',
    'approve refund', 'reject refund', 'approve payment', 'verify payment',
    'conductor scan', 'conductor validate', 'offline scanner',
    'admin panel', 'manage staff', 'manage conductor', 'drop database',
  ];

  if (restrictedKeywords.some((kw) => lower.includes(kw))) {
    const reply = isAmharic
      ? 'á‹­á‰…áˆ­á‰³á£ áŠ¥áŠ” á‹¨á‰°áŒ“á‹¦á‰½ áˆ¨á‹³á‰µ á‰¥á‰» áŠáŠá¢ á‹¨áŠ áˆµá‰°á‹³á‹³áˆªá£ á‹¨áŠ©á‰£áŠ•á‹« áˆ°áˆ«á‰°áŠ› á‹ˆá‹­áˆ á‹¨áŠ áˆµá‰°áŠ“áŒ‹áŒ… (Conductor) áˆµáˆ«á‹Žá‰½áŠ• áˆ›áŠ¨áŠ“á‹ˆáŠ• áŠ áˆá‰½áˆáˆá¢ áŠ á‹á‰¶á‰¡áˆµ áˆˆáˆ˜áˆáˆˆáŒá£ á‰µáŠ¬á‰µ áˆˆáˆ˜á‹«á‹ á‹ˆá‹­áˆ á‹¨áŠ­áá‹« áˆ˜áˆ˜áˆªá‹«á‹Žá‰½áŠ• áˆˆáˆ˜áŒ á‹¨á‰… áˆáˆ¨á‹³á‹Ž áŠ¥á‰½áˆ‹áˆˆáˆá¢'
      : 'I am strictly authorized to provide passenger travel services only (such as searching bus schedules, checking seat availability, booking guidance, and payment instructions). I cannot perform administrative, conductor, or staff management operations.';
    return {
      reply,
      source: 'ethiotrip_passenger_scope_guard',
      extractedSearch: null,
    };
  }

  
  const outOfScopePatterns = [
    /\b(write\s+(?:a\s+)?(?:code|program|python|javascript|script|essay|story|poem|song|recipe))\b/i,
    /\b(python|javascript|typescript|c\+\+|java\b|html|css|sql|function\s*\(|def\s+[a-z_])/i,
    /\b(who\s+is\s+the\s+president|prime\s+minister|capital\s+of|weather\s+in|forecast\s+for)\b/i,
    /\b(tell\s+me\s+a\s+joke|write\s+an\s+essay|solve\s+math|do\s+my\s+homework)\b/i,
    /\b(crypto|bitcoin|ethereum|forex\s+trading|stock\s+market)\b/i,
    /\b(flights?\s+to|airline|hotel\s+in|train\s+in|subway|eurostar|uber|lyft)\b/i,
  ];

  const hasTransitKeyword =
    lower.includes('ethio') ||
    lower.includes('trip') ||
    lower.includes('bus') ||
    lower.includes('ticket') ||
    lower.includes('seat') ||
    lower.includes('chapa') ||
    lower.includes('telebirr') ||
    lower.includes('cbe') ||
    lower.includes('schedule') ||
    lower.includes('route') ||
    lower.includes('fare') ||
    lower.includes('selam') ||
    lower.includes('sky') ||
    lower.includes('zemen') ||
    lower.includes('abay') ||
    lower.includes('habesha') ||
    Object.keys(CITY_MAP).some((city) => lower.includes(city));

  if (!hasTransitKeyword && outOfScopePatterns.some((pattern) => pattern.test(lower))) {
    const reply = isAmharic
      ? 'á‹­á‰…áˆ­á‰³á£ áŠ¥áŠ” á‹¨áŠ¢á‰µá‹® á‰µáˆªá• (Ethio Trip) á‹¨áŠ á‹á‰¶á‰¡áˆµ á‰µáŠ¬á‰µ áŠ áŒˆáˆáŒáˆŽá‰µ áˆ¨á‹³á‰µ á‰¥á‰» áŠáŠá¢ áŠ áŒ á‰ƒáˆ‹á‹­ áŠ¥á‹á‰€á‰µá£ á‹¨áŠ®á‹²áŠ•áŒ á‹ˆá‹­áˆ áŠ¨áŠ¢á‰µá‹® á‰µáˆªá• á‹áŒª á‹«áˆ‰ áŒ¥á‹«á‰„á‹Žá‰½áŠ• áˆ˜áˆ˜áˆˆáˆµ áŠ áˆá‰½áˆáˆá¢ áˆµáˆˆ áŠ á‹á‰¶á‰¡áˆµ áŒ‰á‹žá£ á‰µáŠ¬á‰µ á‹ˆá‹­áˆ áŠ­áá‹« áŒ¥á‹«á‰„ áŠ«áˆˆá‹Žá‰µ á‰ á‹°áˆµá‰³ áŠ¥áˆ¨á‹³á‹Žá‰³áˆˆáˆ!'
      : 'I am exclusively the Ethio Trip Passenger Assistant. I can only assist with Ethiopian intercity bus travel, schedules, seat bookings, routes, fares, and payments on the Ethio Trip platform.';
    return {
      reply,
      source: 'ethiotrip_scope_guard',
      extractedSearch: null,
    };
  }

  const isLoggedIn = !!(authenticatedUser && (authenticatedUser._id || authenticatedUser.id));
  const passengerName = authenticatedUser?.name || authenticatedUser?.firstName || 'Passenger';

  const isDirectDbOrAutoWrite =
    lower.includes('insert into') ||
    lower.includes('update ') ||
    lower.includes('delete from') ||
    lower.includes('query db') ||
    lower.includes('direct db') ||
    lower.includes('access db') ||
    lower.includes('access database') ||
    lower.includes('book for me now') ||
    lower.includes('book this for me') ||
    lower.includes('reserve for me') ||
    lower.includes('create booking for me') ||
    lower.includes('á‰µáŠ¬á‰µ á‰áˆ¨áŒ¥áˆáŠ') ||
    lower.includes('áˆ˜á‹áŒá‰¥áˆáŠ');

  if (isDirectDbOrAutoWrite) {
    const reply = isAmharic
      ? 'áŠ¥áŠ” á‰ á‰€áŒ¥á‰³ á‹¨á‹³á‰³á‰¤á‹ (Database) á‰µá‹•á‹›á‹žá‰½áŠ• áˆ›áŠ¨áŠ“á‹ˆáŠ• á‹ˆá‹­áˆ á‰µáŠ¬á‰¶á‰½áŠ• á‰ á‰€áŒ¥á‰³ áˆ˜á‰áˆ¨áŒ¥ áŠ áˆá‰½áˆáˆá¢ áˆˆá‹°áˆ…áŠ•áŠá‰µá‹Ž áˆ²á‰£áˆ á‹¨áˆ˜á‰€áˆ˜áŒ« áˆáˆ­áŒ« áŠ¥áŠ“ áŠ­áá‹« á‹¨áˆšáŠ¨áŠ“á‹ˆáŠá‹ áŠ¥áˆ­áˆµá‹Ž á‰ á‰€áŒ¥á‰³ á‰ áˆµáˆ­á‹“á‰± á‹¨ááˆˆáŒ‹ áŒˆáŒ½ áˆ‹á‹­ á‹ˆáŠ•á‰ áˆ­ áˆ˜áˆ­áŒ á‹ á‰ á‰»á“ (Chapa) á‹ˆá‹­áˆ á‰ á‰´áˆŒá‰¥áˆ­/áˆ²á‰¢áŠ¢ á‰¥áˆ­ á‹°áˆ¨áˆ°áŠ á‰ áˆ˜áŒ«áŠ• á‰¥á‰» áŠá‹á¢'
      : 'For your security and data integrity, I do not have direct database access and cannot create or modify bookings directly. All seat selections and payments must be completed through the official Ethio Trip interface by choosing your seats on the interactive bus layout!';
    return {
      reply,
      source: 'ethiotrip_security_guard',
      extractedSearch: null,
    };
  }

  const isPersonalBookingAction =
    lower.includes('i want to book') ||
    lower.includes('book a seat') ||
    lower.includes('book a ticket') ||
    lower.includes('book ticket') ||
    lower.includes('my ticket') ||
    lower.includes('my booking') ||
    lower.includes('cancel booking') ||
    lower.includes('cancel my') ||
    lower.includes('request refund') ||
    lower.includes('á‰µáŠ¬á‰µ áˆ˜á‹«á‹ áŠ¥áˆáˆáŒ‹áˆˆáˆ') ||
    lower.includes('á‰µáŠ¬á‰´') ||
    lower.includes('á‰¦á‰³ áˆ›áˆµá‹«á‹ áŠ¥áˆáˆáŒ‹áˆˆáˆ');

  if (!isLoggedIn && isPersonalBookingAction) {
    const reply = isAmharic
      ? 'á‰ áŠ¢á‰µá‹® á‰µáˆªá• (Ethio Trip) á‰µáŠ¬á‰µ áˆˆáˆ˜á‹«á‹á£ á‹¨á‰°á‹«á‹™ á‰µáŠ¬á‰¶á‰½áŠ• áˆˆáˆ›á‹¨á‰µ á‹ˆá‹­áˆ áŠ­áá‹« áˆˆáˆ˜áˆáŒ¸áˆ áŠ áˆµá‰€á‹µáˆ˜á‹ á‹ˆá‹° á‰°áŒ“á‹¥ áˆ˜áˆˆá‹«á‹Ž áˆ˜áŒá‰£á‰µ (Login áˆ›á‹µáˆ¨áŒ) áŠ áˆˆá‰¥á‹Žá‰µá¢ áŠ¥á‰£áŠ­á‹Ž áˆ˜áŒ€áˆ˜áˆªá‹« á‹ˆá‹° áˆ˜áˆˆá‹«á‹Ž á‹­áŒá‰¡ á‹ˆá‹­áˆ áŠ á‹²áˆµ á‹­áˆ˜á‹áŒˆá‰¡á¤ áŠ¨á‹šá‹«áˆ á‹¨áˆšáˆáˆáŒ‰á‰µáŠ• áŠ á‹á‰¶á‰¡áˆµ áŠ¥áŠ“ á‹ˆáŠ•á‰ áˆ­ áˆ˜áˆ­áŒ á‹ áˆ˜á‹«á‹ á‹­á‰½áˆ‹áˆ‰á¢'
      : 'In the Ethio Trip system, you must be logged in to your passenger account to book seats, view personal tickets, or make payments. Please log in or register an account first. Once logged in, you can select your seat on the interactive seat layout and complete your booking!';
    return {
      reply,
      source: 'ethiotrip_passenger_login_guard',
      requiresLogin: true,
      extractedSearch: null,
    };
  }

  const isSearchIntent =
    lower.includes('bus') ||
    lower.includes('trip') ||
    lower.includes('schedule') ||
    lower.includes('ticket') ||
    lower.includes('travel') ||
    lower.includes('go to') ||
    lower.includes('from') ||
    lower.includes('to') ||
    lower.includes('áˆ˜áˆ„á‹µ') ||
    lower.includes('áŠ á‹á‰¶á‰¡áˆµ') ||
    lower.includes('áŒ‰á‹ž') ||
    lower.includes('á‰µáŠ¬á‰µ') ||
    lower.includes('áˆáˆáŒ');

  const { origin, destination, date, passengers } = extractSearchParameters(query);

  if ((origin && !destination) || (!origin && destination)) {
    const knownCity = origin || destination;
    const missingRole = origin ? 'destination' : 'origin';
    const reply = isAmharic
      ? `"${knownCity}" á‰°áŒˆáŠá‰·áˆá¢ ${missingRole === 'destination' ? 'á‹¨áˆšáˆ„á‹±á‰ á‰µáŠ•' : 'á‹¨áˆšáŠáˆ±á‰ á‰µáŠ•'} á‰¦á‰³ (áŠ¨${knownCity} ${missingRole === 'destination' ? 'á‹ˆá‹°' : ''}) á‹­áŒ¥á‰€áˆ±á¢`
      : `I found "${knownCity}" in this system. Could you also specify the ${missingRole} city so I can check available buses for you?`;
    return {
      reply,
      source: 'ethiotrip_passenger_engine',
      extractedSearch: null,
    };
  }

  const isAvailableBusesQuery =
    lower.includes('show me available bus') ||
    lower.includes('show me available buses') ||
    lower.includes('available bus') ||
    lower.includes('available buses') ||
    lower.includes('list buses') ||
    lower.includes('list available buses') ||
    lower.includes('what buses are available') ||
    lower.includes('are there any buses') ||
    lower.includes('upcoming buses') ||
    lower.includes('see buses') ||
    lower.includes('buses available') ||
    query.includes('ያሉ አውቶቡሶችን አሳየኝ') ||
    query.includes('ያሉ አውቶቡሶች') ||
    query.includes('የሚገኙ አውቶቡሶች') ||
    query.includes('አውቶቡስ አሳየኝ') ||
    query.includes('ምን አውቶቡስ አለ') ||
    query.includes('የአውቶቡስ መርሃ ግብር');

  if (isAvailableBusesQuery) {
    try {
      const searchFilter = {};
      if (origin) searchFilter.from = origin;
      if (destination) searchFilter.to = destination;
      if (date) searchFilter.date = date;

      const schedules = await scheduleService.searchSchedules(searchFilter);
      const count = Array.isArray(schedules) ? schedules.length : 0;

      if (count > 0) {
        const topSchedules = schedules.slice(0, 5);
        if (isAmharic) {
          const list = topSchedules
            .map((s) => `• **${s.companyId?.companyName || 'Ethio Trip'}**: ${s.route?.from || 'መነሻ'} ➔ ${s.route?.to || 'መድረሻ'} | ቀን: ${s.date}፣ ሰዓት: ${s.departureTime} | ዋጋ: ${s.price} ብር | ክፍት ወንበሮች: ${s.availableSeats}`)
            .join('\n');
          const reply = `በአሁኑ ሰዓት በኢትዮ ትሪፕ (Ethio Trip) የሚገኙ ንቁ የአውቶቡስ መርሃ-ግብሮች (${count} ጉዞዎች ተገኝተዋል)፦\n\n${list}\n\n**ትኬት ለመቁረጥ እና ለመያዝ የሚከተሉትን ደረጃዎች ይከተሉ፦**\n1. በግራ ሜኑ ላይ **"Search & Book Bus"** ን ይክፈቱ።\n2. መነሻ፣ መድረሻ እና የጉዞ ቀን በመምረጥ **"Select Seats"** ን ይጫኑ።\n3. በይነተገናኝ የአውቶቡስ ወንበር ካርታ ላይ የመረጡትን መቀመጫ ይምረጡ።\n4. በቻፓ (Chapa) በቅጽበት ወይንም በቴሌብር/ሲቢኢ ብር ደረሰኝ በመጫን ክፍያ ይፈጽሙ።\n5. ክፍያው እንደተጠናቀቀ ዲጂታል የQR ኮድ ትኬትዎን ከ**"My E-Tickets"** ማውረድ ወይም ማየት ይችላሉ!`;
          return {
            reply,
            toolExecuted: 'listAvailableBuses',
            source: 'ethiotrip_available_buses_engine',
            extractedSearch: origin && destination ? { origin, destination, date, passengers } : null,
            schedulesCount: count,
          };
        } else {
          const list = topSchedules
            .map((s) => `• **${s.companyId?.companyName || 'Ethio Trip'}**: ${s.route?.from || 'Origin'} ➔ ${s.route?.to || 'Destination'} | Date: ${s.date}, Time: ${s.departureTime} | Fare: ${s.price} ETB | Open Seats: ${s.availableSeats}`)
            .join('\n');
          const reply = `Here are the currently available intercity bus schedules on Ethio Trip (${count} trip(s) found):\n\n${list}\n\n**How to Book Your Seat Step-by-Step:**\n1. Click **"Search & Book Bus"** on your dashboard navigation.\n2. Choose your departure, destination, and date, then click **"Select Seats"** on your preferred operator.\n3. Pick your desired seat number on the interactive bus layout (Green = Available).\n4. Complete checkout via **Chapa** (Instant confirmation) or **Telebirr / CBE Birr** receipt upload.\n5. Access your confirmed QR code e-ticket under **"My E-Tickets"** for boarding!`;
          return {
            reply,
            toolExecuted: 'listAvailableBuses',
            source: 'ethiotrip_available_buses_engine',
            extractedSearch: origin && destination ? { origin, destination, date, passengers } : null,
            schedulesCount: count,
          };
        }
      } else {
        const reply = isAmharic
          ? 'በአሁኑ ሰዓት በዚህ መስመር ወይም ቀን የተመደበ ክፍት አውቶቡስ አልተገኘም። እባክዎ በ"Search & Book Bus" ገጽ ላይ ሌላ የጉዞ ቀን ወይም መስመር ይሞክሩ።'
          : 'No scheduled buses found for the requested criteria. Please try another travel date or check popular routes like Addis Ababa to Bahir Dar, Hawassa, or Dire Dawa!';
        return {
          reply,
          source: 'ethiotrip_available_buses_engine',
          extractedSearch: null,
          schedulesCount: 0,
        };
      }
    } catch (err) {
      console.error('[AIAssistant availableBuses error]:', err.message);
    }
  }

  const isRefundGuideQuery =
    lower.includes('refund') ||
    lower.includes('cancel') ||
    lower.includes('cancellation') ||
    query.includes('ተመላሽ') ||
    query.includes('ስረዛ') ||
    query.includes('ገንዘብ ተመላሽ');

  if (isRefundGuideQuery) {
    const reply = isAmharic
      ? `**የተመላሽ ገንዘብ እና ስረዛ አጠያየቅ ሂደት (የተሳፋሪ መመሪያ እና ደንብ)፦**

1. **ወደ ተመላሽ ገጽ ይሂዱ፦** በተሳፋሪ ዳሽቦርድዎ የግራ ሜኑ ላይ **"Cancellation & Refund"** (ወይም **"My Bookings"**) የሚለውን ይጫኑ።
2. **ትኬትዎን ይምረጡ፦** መሰረዝ የሚፈልጉትን የተረጋገጠ ትኬት ፈልገው **"Request Refund"** / **"Cancel Booking"** የሚለውን ቁልፍ ይጫኑ።
3. **⚠️ የጊዜ ገደብ ህግ (Strict Policy Limit)፦** የተመላሽ ገንዘብ ጥያቄ ማቅረብ የሚቻለው **እስከ ጉዞው መነሻ ቀን ድረስ ብቻ** ነው። የጉዞው መነሻ ቀን ከደረሰ ወይም ካለፈ በኋላ የተመላሽ ጥያቄ ማቅረብ በስርዓቱ አይፈቀድም!
4. **የአስተዳዳሪ ማረጋገጫ (Role Limit)፦** ተሳፋሪዎች ተመላሽ መጠየቅ ብቻ የሚችሉ ሲሆን፣ ጥያቄውን የሚመረምረውና የሚያጸድቀው የኩባንያው አስተዳዳሪ (Company Admin) ነው።
5. **የገንዘብ ተመላሽ አከፋፈል፦** አስተዳዳሪው ጥያቄውን ካጸደቀ በኋላ፣ የኩባንያው ሰራተኛ (Company Staff) ገንዘቡን በምን መንገድ (ቴሌብር፣ ሲቢኢ ብር ወይንም የባንክ ሂሳብ) መመለስ እንደሚፈልጉ ለመጠየቅ **በተመዘገበው ኢሜይልዎ** መልዕክት ይልካሉ!`
      : `**How to Request a Cancellation & Refund (Passenger Guide & Policy):**

1. **Navigate to Cancellation & Refund:** In your Passenger Dashboard sidebar, click **"Cancellation & Refund"** (or go to **"My Bookings"**).
2. **Locate Your Booking:** Find your confirmed trip reservation and click the **"Request Refund"** button.
3. **⚠️ Strict Policy Limit:** Refund requests can **ONLY be submitted up to the trip departure day** (before the travel departure date). Once the departure day or time has arrived or passed, refunds cannot be requested!
4. **Admin Approval (Role Boundary):** As a passenger, you submit the refund request for review. It must be approved by the transport company's **Company Admin**.
5. **Payout Communication via Email:** Once approved by the admin, **Company Staff** will review the approval and reach out to you directly via your **registered email** to ask which payment method (Telebirr, CBE Birr, or Bank Account) you want your refund sent to!`;

    return {
      reply,
      source: 'ethiotrip_passenger_guide_engine',
      extractedSearch: null,
    };
  }

  const isBookingGuideQuery =
    lower.includes('how to book') ||
    lower.includes('how do i book') ||
    lower.includes('booking process') ||
    lower.includes('seat selection') ||
    lower.includes('how to select seat') ||
    query.includes('እንዴት ልያዝ') ||
    query.includes('ትኬት እንዴት ልቁረጥ') ||
    query.includes('የወንበር ምርጫ');

  if (isBookingGuideQuery) {
    const reply = isAmharic
      ? `**የአውቶቡስ ትኬት መያዝ ደረጃዎች (Booking Process)፦**\n\n1. **"Search & Book Bus"** ን ይክፈቱ፦ መነሻ ከተማ፣ መድረሻ ከተማ እና የጉዞ ቀን ይምረጡ።\n2. **ኦፕሬተር ይምረጡ፦** ከቀረቡት ኩባንያዎች (ሰላም፣ ስካይ፣ ዘመን፣ አባይ) ዋጋ እና ሰዓት በማነጻጸር **"Select Seats"** ን ይጫኑ።\n3. **ወንበር ይምረጡ፦** በይነተገናኝ ካርታው ላይ የሚፈልጉትን ወንበር ይምረጡ (አረንጓዴ = ክፍት)።\n4. **መረጃዎን ያረጋግጡ፦** የተሳፋሪ ስም እና ስልክ ቁጥር አረጋግጠው ወደ ክፍያ ይቀጥሉ።\n5. **ክፍያ ይፈጽሙ፦** በቻፓ ወይም በቴሌብር/ሲቢኢ ብር ክፍያውን ያጠናቁ!`
      : `**How to Search & Book Bus Seats Step-by-Step:**\n\n1. **Search:** Go to **"Search & Book Bus"**, choose your origin city, destination city, and date.\n2. **Compare:** Browse scheduled departures from verified operators (Selam Bus, Sky Bus, Zemen Bus) with ratings and prices.\n3. **Select Seats:** Click **"Select Seats"** to open the interactive seat layout. Choose your seats (Green = Available, Blue = Selected).\n4. **Proceed:** Confirm passenger contact details and click **"Proceed to Payment"**.\n5. **Confirm:** Pay online via Chapa or upload a Telebirr/CBE receipt!`;

    return {
      reply,
      source: 'ethiotrip_passenger_guide_engine',
      extractedSearch: null,
    };
  }

  const isPaymentGuideQuery =
    lower.includes('how to pay') ||
    lower.includes('payment method') ||
    lower.includes('payment process') ||
    lower.includes('pay center') ||
    query.includes('እንዴት ልክፈል') ||
    query.includes('የክፍያ ዘዴ');

  if (isPaymentGuideQuery) {
    const reply = isAmharic
      ? `**የክፍያ አፈጻጸም መመሪያ (Payment Center)፦**\n\nበኢትዮ ትሪፕ ሁለት የክፍያ አማራጮች አሉ፦\n1. **ቻፓ (Chapa - ፈጣን ኦንላይን ክፍያ)፦** በቴሌብር፣ በሲቢኢ ብር ወይም በባንክ ካርድ በቅጽበት ይክፈሉ። ክፍያው እንደተፈጸመ ትኬትዎ ወዲያውኑ ይረጋገጣል!\n2. **ቀጥታ ቴሌብር / ሲቢኢ ብር (የደረሰኝ ጭነት)፦** ወደ ኩባንያው ይፋዊ ሂሳብ ገንዘብ ልከው የግብይት ቁጥር ወይም የደረሰኝ ፎቶ በ"Payment Center" ይጫኑ። የኩባንያው ሰራተኞች ደረሰኙን ፈትሸው ትኬትዎን ያጸድቃሉ!`
      : `**How Payments Work on Ethio Trip:**\n\nWe provide two official payment options for passengers:\n1. **Chapa (Instant Online Payment):** Pay directly with Telebirr, CBE Birr, or debit cards. Your ticket is confirmed instantly with zero waiting time!\n2. **Telebirr / CBE Birr Receipt Upload:** Transfer funds externally to the operator's official account and upload your payment reference/screenshot in the **Payment Center**. Company Staff will verify your receipt and issue your ticket!`;

    return {
      reply,
      source: 'ethiotrip_passenger_guide_engine',
      extractedSearch: null,
    };
  }

  const isTicketDownloadGuideQuery =
    lower.includes('how to download ticket') ||
    lower.includes('where is my ticket') ||
    lower.includes('get qr code') ||
    lower.includes('board bus') ||
    query.includes('ትኬት እንዴት ላውርድ') ||
    query.includes('ትኬቴ የት አለ') ||
    query.includes('ኪውአር ኮድ');

  if (isTicketDownloadGuideQuery) {
    const reply = isAmharic
      ? `**ኢ-ትኬት ማውረድ እና መጠቀም (E-Tickets & QR Code)፦**\n\n1. ክፍያዎ ከተረጋገጠ በኋላ በግራ ሜኑ ላይ **"My E-Tickets"** የሚለውን ይክፈቱ።\n2. የጉዞ ዝርዝርዎን፣ የመቀመጫ ቁጥርዎን እና የተረጋገጠውን ዲጂታል **QR ኮድ** ያገኛሉ።\n3. **"Download Ticket"** የሚለውን በመጫን ይፋዊውን PDF ትኬት ማውረድ ወይም ማተም ይችላሉ።\n4. በጉዞው ቀን ማረጋገጫ QR ኮዱን በሞባይልዎ ለኮንዳክተሩ በማሳየት በቀላሉ ይሳፈሩ!`
      : `**How to Access & Download Your E-Ticket:**\n\n1. Once your booking payment is confirmed, click **"My E-Tickets"** in your passenger dashboard.\n2. You will see your confirmed ticket with your seat number, departure time, and verified **QR Code**.\n3. Click **"Download Ticket"** to download the official boarding PDF or print it.\n4. On travel day, present the digital QR code on your mobile phone to the bus conductor to scan and board!`;

    return {
      reply,
      source: 'ethiotrip_passenger_guide_engine',
      extractedSearch: null,
    };
  }

  if (origin && destination && (isSearchIntent || lower.includes('search') || isAmharic)) {
    try {
      const schedules = await scheduleService.searchSchedules({
        from: origin,
        to: destination,
        date,
      });

      const count = Array.isArray(schedules) ? schedules.length : 0;
      let reply = '';

      if (isAmharic) {
        if (count > 0) {
          const list = schedules
            .slice(0, 3)
            .map((s) => `â€¢ ${s.companyId?.companyName || 'Ethio Trip'} â€” ${s.departureTime} (á‹‹áŒ‹á¡ ${s.price} á‰¥áˆ­á£ á‰€áˆª á‹ˆáŠ•á‰ áˆ­á¡ ${s.availableSeats})`)
            .join('\n');
          reply = `áŠ¨${origin} á‹ˆá‹° ${destination} á‰ á‰€áŠ• ${date} ${count} á‹¨áˆšáŒˆáŠ™ áŠ á‹á‰¶á‰¡áˆ¶á‰½ á‰°áŒˆáŠá‰°á‹‹áˆá¡\n\n${list}\n\ná‹¨ááˆˆáŒ‹ á‰…áŒ¹áŠ• á‰ áˆ«áˆµ-áˆ°áˆ­ áˆžáˆá‰¼áˆá‹Žá‰³áˆˆáˆá¢ á‹¨áˆšáˆáˆáŒ‰á‰µáŠ• á‹ˆáŠ•á‰ áˆ­ áˆ˜áˆ­áŒ á‹ áˆ˜á‹«á‹ á‹­á‰½áˆ‹áˆ‰!`;
        } else {
          reply = `áŠ¨${origin} á‹ˆá‹° ${destination} á‰ á‰€áŠ• ${date} á‹¨á‰°á‹«á‹˜ áŠ á‹á‰¶á‰¡áˆµ áŠ áˆá‰°áŒˆáŠ˜áˆá¢ áŠ¥á‰£áŠ­á‹Ž áˆŒáˆ‹ á‰€áŠ• á‹ˆá‹­áˆ áˆŒáˆ‹ áˆ˜áˆµáˆ˜áˆ­ á‹­áˆžáŠ­áˆ©á¢`;
        }
      } else {
        if (count > 0) {
          const list = schedules
            .slice(0, 3)
            .map((s) => `â€¢ ${s.companyId?.companyName || 'Ethio Trip'} â€” Departs at ${s.departureTime} (Fare: ${s.price} ETB, Seats Left: ${s.availableSeats})`)
            .join('\n');
          reply = `Found ${count} available bus trip(s) from ${origin} to ${destination} on ${date}:\n\n${list}\n\nI have automatically filled in your search form with these details so you can select your seats and proceed!`;
        } else {
          reply = `No scheduled buses found from ${origin} to ${destination} on ${date}. Please try a different travel date or operator.`;
        }
      }

      return {
        reply,
        toolExecuted: 'searchBuses',
        source: 'ethiotrip_controlled_tool',
        extractedSearch: { origin, destination, date, passengers },
        schedulesCount: count,
      };
    } catch (err) {
      console.error('[AIAssistant searchBuses error]:', err.message);
    }
  }

  if (isSearchIntent && !origin && !destination && (
    lower.includes('help') || lower.includes('find') || lower.includes('search') ||
    lower.includes('look') || lower.includes('book') || lower.includes('want') ||
    lower.includes('need') || lower.includes('schedule') || lower.includes('where') ||
    lower.includes('how') || lower.includes('áˆ˜áˆáˆˆáŒ') || lower.includes('á‹¨á‰µáŠ¬á‰µ')
  )) {
    const reply = isAmharic
      ? 'á‰ áŠ¢á‰µá‹® á‰µáˆªá• (Ethio Trip) á‹¨áˆšáŒˆáŠ™ áŠ á‹á‰¶á‰¡áˆ¶á‰½áŠ•áŠ“ áŠ­áá‰µ áˆ˜á‰€áˆ˜áŒ«á‹Žá‰½áŠ• áˆˆáˆ›áŒáŠ˜á‰µ áŠ¥á‰£áŠ­á‹Ž á‹¨áˆšáŠ¨á‰°áˆ‰á‰µáŠ• á‹­áŒ¥á‰€áˆ±á¡\n\n1. **á‹¨áˆ˜áŠáˆ» áŠ¨á‰°áˆ›** (áˆˆáˆáˆ³áˆŒá¡ áŠ á‹²áˆµ áŠ á‰ á‰£á£ á‰£áˆ…áˆ­ á‹³áˆ­á£ áˆ€á‹‹áˆ³á£ áŒŽáŠ•á‹°áˆ­á£ á‹µáˆ¬á‹³á‹‹)\n2. **á‹¨áˆ˜á‹µáˆ¨áˆ» áŠ¨á‰°áˆ›**\n3. **á‹¨áŒ‰á‹ž á‰€áŠ•**\n\náŠ¥áŠá‹šáˆ…áŠ• áˆ²áŒ½á‰áˆáŠ á‹«áˆ‰á‰µáŠ• áŠ á‹á‰¶á‰¡áˆ¶á‰½ (áˆ°áˆ‹áˆá£ áˆµáŠ«á‹­á£ á‹˜áˆ˜áŠ•á£ áŠ á‰£á‹­) áŠ¥áŠ“ á‹‹áŒ‹á‰¸á‹áŠ• á‹ˆá‹²á‹«á‹áŠ‘ áŠ á‰€áˆ­á‰¥áˆá‹Žá‰³áˆˆáˆ!'
      : 'To help you find available buses and open seats across Ethiopia on Ethio Trip, please provide:\n\n1. **Departure City** (e.g., Addis Ababa, Bahir Dar, Hawassa, Gondar, Dire Dawa, Dessie, Jimma)\n2. **Destination City**\n3. **Travel Date**\n\nYou can also use the **Bus Search** section on your dashboard to see real-time schedules, ticket fares, and seats from operators including Selam Bus, Sky Bus, and Zemen Bus!';
    return {
      reply,
      source: 'ethiotrip_passenger_engine',
      extractedSearch: null,
    };
  }

  if (geminiModel) {
    try {
        let passengerDbContext = null;
  if (isLoggedIn) {
    try {
      passengerDbContext = await getPassengerDbContext(authenticatedUser);
    } catch (err) {
      console.warn('[AIAssistant] Could not load passenger DB context:', err.message);
    }
  }

  let liveSchedulesSummary = 'None currently scheduled';
  try {
    const liveSchedules = await scheduleService.searchSchedules({});
    if (Array.isArray(liveSchedules) && liveSchedules.length > 0) {
      liveSchedulesSummary = liveSchedules.slice(0, 8).map((s) => 
        `- Operator: ${s.companyId?.companyName || 'Ethio Trip'}, Route: ${s.route?.from || 'Origin'} to ${s.route?.to || 'Destination'}, Date: ${s.date}, Departure: ${s.departureTime}, Fare: ${s.price} ETB, Available Seats: ${s.availableSeats}`
      ).join('\n');
    }
  } catch (schErr) {
    console.warn('[AIAssistant] Could not load live schedules for Gemini context:', schErr.message);
  }

  const safeContextJson = passengerDbContext ? JSON.stringify(passengerDbContext) : 'null';

  const userContextStr = isLoggedIn
    ? `The user is currently a LOGGED-IN PASSENGER (Name: "${passengerName}"). They are authenticated and can book trips through the official web interface.`
    : `The user is currently a GUEST (NOT LOGGED IN). They can search schedules, but if they want to book seats, access tickets, or pay, they MUST log in or register first.`;
const systemInstruction = `You are "Ethio Trip Assistant", the dedicated customer support assistant for "Ethio Trip" (Ethiopia's smart multi-operator intercity bus ticketing system).

CURRENT PASSENGER STATUS:
${userContextStr}

PASSENGER DB CONTEXT (CURRENT, AUTHENTICATED DATA — READ-ONLY, SANITIZED):
${safeContextJson}

REAL-TIME AVAILABLE BUS SCHEDULES IN SYSTEM:
${liveSchedulesSummary}

CRITICAL ARCHITECTURAL & ROLE LIMITS:
1. THIS SYSTEM ONLY (NO EXTERNAL, GLOBAL, OR GENERAL TOPICS):
   - You ONLY provide information regarding the Ethio Trip platform and its registered operators: Selam Bus Line, Sky Bus Line, Zemen Bus, Abay Bus, and Habesha Bus.
   - You ONLY cover intercity bus routes between Ethiopian cities (Addis Ababa, Bahir Dar, Hawassa, Gondar, Mekelle, Dire Dawa, Jimma, Dessie, Harar, Adama, Arba Minch, Jijiga).
   - If passenger asks "show me available buses" or asks for trips, list the active scheduled buses above with company, route, departure, fare, and available seats!
   - NEVER answer questions about non-Ethiopian travel, city taxis, flights, trains, or external systems.
   - NEVER answer questions about general knowledge, coding, politics, entertainment, or unrelated topics. If asked, politely refuse: "I am exclusively the Ethio Trip Assistant. I can only assist with Ethio Trip bus schedules, seat bookings, routes across Ethiopia, and payments on our platform."

2. PASSENGER PORTAL PROCESSES & STRICT CANCELLATION REFUND POLICY:
   - When asked "how do I ask for refund" or how to cancel:
     * Explain the passenger's exact role boundary: Passengers can only submit requests for their own confirmed bookings.
     * STRICT POLICY RULE: Refunds can ONLY be requested UP TO THE TRIP DEPARTURE DAY (before the travel date). Once the departure day or time has passed, cancellation and refund are strictly closed and impossible!
     * STEP-BY-STEP: Go to "Cancellation & Refund" tab -> click "Request Refund" on the booking -> Company Admin reviews and approves -> Company Staff then sends an email to the passenger asking which payment method (Telebirr, CBE Birr, or Bank Account) they want the refund payout sent to.
     * Explain that passengers cannot approve refunds themselves (admin approval only).
   - How to book: Go to "Search & Book Bus" -> select cities and date -> click "Select Seats" -> pick seat numbers on the interactive layout -> proceed to checkout.
   - How to pay: Use Chapa for instant online confirmation (Telebirr, CBE Birr, Card), or upload external Telebirr/CBE Birr transfer receipt in "Payment Center".
   - How to download tickets: Go to "My E-Tickets" -> view digital QR code -> click "Download Ticket" (PDF).

3. NO DIRECT DATABASE ACCESS:
   - You do NOT have direct database write access and CANNOT create, update, or cancel bookings directly on behalf of passengers.
   - Explain to passengers that all seat choices and bookings must be made securely by clicking "Select Seats" on the interactive seat layout in the web application.

4. PASSENGER-ONLY SCOPE:
   - You strictly assist passengers. Refuse any administrative, conductor, or company staff operations.

5. LANGUAGE & ACCURACY:
   - Understand human natural language in both English and Amharic. Answer clearly and politely in the user's language (English or Amharic). Match their tone and keep responses concise and structured.`;

      const contents = [];
      const recentHistory = (Array.isArray(conversationHistory) ? conversationHistory : []).slice(-6);
      for (const msg of recentHistory) {
        if (msg.role === 'user' || msg.role === 'model') {
          contents.push({
            role: msg.role,
            parts: [{ text: msg.content || msg.parts?.[0]?.text || '' }],
          });
        }
      }

      const contextPrefix = `[ETHIO TRIP SYSTEM CONTEXT:
System: Ethio Trip Smart Bus Ticketing System (Ethiopia).
User Status: ${isLoggedIn ? `Logged-in Passenger (${passengerName})` : 'Guest / Not Logged In'}.
Operators: Selam Bus, Sky Bus, Zemen Bus, Abay Bus, Habesha Bus.
Rules: (1) Answer ONLY for the Ethio Trip platform and Ethiopian intercity bus travel. (2) Strictly REFUSE all non-transit or general global questions (e.g. coding, general trivia, politics, recipes, flights). (3) You have NO direct database access and cannot book on behalf of users; users must pick seats in the UI. (4) If guest wants to book, remind them login is required. (5) Never mention foreign cities or external apps.]\n\n`;

      contents.push({
        role: 'user',
        parts: [{ text: contextPrefix + query }],
      });

      const candidateModels = [
        process.env.GEMINI_MODEL,
        'gemini-3.1-flash-lite',
        'gemini-3.5-flash-lite',
        'gemini-3.8-flash',
      ].filter(Boolean);
      const modelsToTry = [...new Set(candidateModels)];

      let reply = null;
      let lastErr = null;

      for (const currentModel of modelsToTry) {
        try {
          const timeoutMs = 8000;
          const callPromise = geminiModel.generateContent({
            model: currentModel,
            contents,
            config: {
              systemInstruction,
              maxOutputTokens: 512,
              temperature: 0.2,
            },
            systemInstruction,
            generationConfig: {
              maxOutputTokens: 512,
              temperature: 0.2,
            },
          });

          let timerId;
          const timeoutPromise = new Promise((_, reject) => {
            timerId = setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs);
          });

          let response;
          try {
            response = await Promise.race([callPromise, timeoutPromise]);
          } finally {
            clearTimeout(timerId);
          }
          const text = response?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text && text.trim()) {
            reply = text.trim();
            return {
              reply,
              source: 'gemini',
              model: currentModel,
              extractedSearch: origin && destination ? { origin, destination, date, passengers } : null,
            };
          }
        } catch (err) {
          lastErr = err;
          console.warn(`[AIAssistant] Model "${currentModel}" error: ${err.message}. Trying next candidate fallback...`);
        }
      }

      if (!reply && lastErr) {
        console.warn('[AIAssistant] All Gemini models failed or unavailable, falling back to local engine:', lastErr.message);
      }
    } catch (err) {
      console.warn('[AIAssistant] Gemini call error, falling back to local engine:', err.message);
    }
  }

  let reply = '';
  if (isAmharic) {
    if (lower.includes('á‰µáŠ¬á‰µ') || lower.includes('áˆ˜á‰áˆ¨áŒ¥') || lower.includes('áˆ˜á‹«á‹')) {
      if (!isLoggedIn) {
        reply = 'á‰ áŠ¢á‰µá‹® á‰µáˆªá• (Ethio Trip) á‰µáŠ¬á‰µ áˆˆáˆ˜á‹«á‹ áŠ áˆµá‰€á‹µáˆ˜á‹ á‹ˆá‹° á‰°áŒ“á‹¥ áˆ˜áˆˆá‹«á‹Ž áˆ˜áŒá‰£á‰µ (Login áˆ›á‹µáˆ¨áŒ) áŠ áˆˆá‰¥á‹Žá‰µá¢ áŠ¥á‰£áŠ­á‹Ž áˆ˜áŒ€áˆ˜áˆªá‹« á‹ˆá‹° áˆ˜áˆˆá‹«á‹Ž á‹­áŒá‰¡ á‹ˆá‹­áˆ áŠ á‹²áˆµ á‹­áˆ˜á‹áŒˆá‰¡á¤ áŠ¨á‹šá‹«áˆ á‹¨áˆšáˆáˆáŒ‰á‰µáŠ• áŠ á‹á‰¶á‰¡áˆµ áŠ¥áŠ“ á‹ˆáŠ•á‰ áˆ­ áˆ˜áˆ­áŒ á‹ áˆ˜á‹«á‹ á‹­á‰½áˆ‹áˆ‰á¢';
      } else {
        reply = `áˆ°áˆ‹áˆ ${passengerName}á£ á‰ áŠ¢á‰µá‹® á‰µáˆªá• á‰µáŠ¬á‰µ áˆˆáˆ˜á‰áˆ¨áŒ¥á¡\n1. áˆ˜áŠáˆ»á£ áˆ˜á‹µáˆ¨áˆ» áŠ¥áŠ“ á‹¨áŒ‰á‹ž á‰€áŠ• á‹­áˆáˆ¨áŒ¡\n2. áŠ¨áˆšá‰€áˆ­á‰¡á‰µ áŠ á‹á‰¶á‰¡áˆ¶á‰½ (áˆ°áˆ‹áˆá£ áˆµáŠ«á‹­á£ á‹˜áˆ˜áŠ•á£ áŠ á‰£á‹­) á‹­áˆáˆ¨áŒ¡\n3. "Select Seats" á‹¨áˆšáˆˆá‹áŠ• á‰°áŒ­áŠá‹ á‹¨áˆšáˆáˆáŒ‰á‰µáŠ• á‹ˆáŠ•á‰ áˆ­ á‹­áˆáˆ¨áŒ¡\n4. á‰ á‰»á“ (Chapa) á‹ˆá‹­áŠ•áˆ á‰ á‰´áˆŒá‰¥áˆ­/áˆ²á‰¢áŠ¢ á‰¥áˆ­ á‹°áˆ¨áˆ°áŠ áŠ­áá‹« áˆáŒ½áˆ˜á‹ á‹¨QR áŠ®á‹µ á‹²áŒ‚á‰³áˆ á‰µáŠ¬á‰µá‹ŽáŠ• á‹«áŒáŠ™!`;
      }
    } else if (lower.includes('áŠ­áá‹«') || lower.includes('á‰´áˆŒá‰¥áˆ­') || lower.includes('á‰¥áˆ­')) {
      reply = 'á‰ áŠ¢á‰µá‹® á‰µáˆªá• áˆáˆˆá‰µ á‹¨áŠ­áá‹« áŠ áˆ›áˆ«áŒ®á‰½ áŠ áˆ‰á¡\n1. á‰ á‰»á“ (Chapa) á‰ áŠ¦áŠ•áˆ‹á‹­áŠ• á‰ á‰€áŒ¥á‰³ áˆ˜áŠ­áˆáˆ (á‹ˆá‹²á‹«á‹áŠ‘ á‰µáŠ¬á‰µá‹Ž á‹­áˆ¨áŒ‹áŒˆáŒ£áˆ)\n2. á‰ á‰´áˆŒá‰¥áˆ­ (Telebirr) á‹ˆá‹­áˆ á‰ áˆ²á‰¢áŠ¢ á‰¥áˆ­ (CBE Birr) áŠ¨ááˆˆá‹ á‹°áˆ¨áˆ°áŠ á‰ áˆ˜áŒ«áŠ• á‰ áŠ©á‰£áŠ•á‹«á‹ áˆ°áˆ«á‰°áŠžá‰½ á‰°áˆ¨áŒ‹áŒáŒ¦ á‰µáŠ¬á‰µá‹Ž á‹­áˆˆá‰€á‰ƒáˆ!';
    } else if (lower.includes('áŠ á‹á‰¶á‰¡áˆµ') || lower.includes('áŒ‰á‹ž') || lower.includes('áˆ˜áˆáˆˆáŒ')) {
      reply = 'á‰ áŠ¢á‰µá‹® á‰µáˆªá• áŠ á‹á‰¶á‰¡áˆµ áˆˆáˆ˜áˆáˆˆáŒ áŠ¥á‰£áŠ­á‹Ž á‹¨áˆ˜áŠáˆ» áŠ¨á‰°áˆ› (áˆˆáˆáˆ³áˆŒá¡ áŠ á‹²áˆµ áŠ á‰ á‰£)á£ á‹¨áˆ˜á‹µáˆ¨áˆ» áŠ¨á‰°áˆ› áŠ¥áŠ“ á‹¨áŒ‰á‹ž á‰€áŠ• á‹­áŒ¥á‰€áˆ±á¢ á‹«áˆ‰á‰µáŠ• áŠ á‹á‰¶á‰¡áˆ¶á‰½áŠ“ áŠ­áá‰µ á‹ˆáŠ•á‰ áˆ®á‰½ á‹ˆá‹²á‹«á‹áŠ‘ áŠ áˆ³á‹­á‹Žá‰³áˆˆáˆ!';
    } else {
      reply = `áˆ°áˆ‹áˆ ${isLoggedIn ? passengerName : ''}! áŠ¥áŠ” á‹¨áŠ¢á‰µá‹® á‰µáˆªá• áˆ¨á‹³á‰µ áŠáŠá¢ á‰ á‹šáˆ… áˆµáˆ­á‹“á‰µ á‹áˆµáŒ¥ áˆµáˆˆáˆšáŒˆáŠ™ áŠ á‹á‰¶á‰¡áˆ¶á‰½á£ á‹¨á‰µáŠ¬á‰µ á‰¦á‰³ áˆ›áˆµá‹«á‹á£ á‹¨áŠ­áá‹« áˆáŠ”á‰³á‹Žá‰½ á‹ˆá‹­áˆ á‹¨áŒ‰á‹ž áˆ˜áˆ¨áŒƒá‹Žá‰½áŠ• áˆáˆ¨á‹³á‹Ž áŠ¥á‰½áˆ‹áˆˆáˆá¢ áˆáŠ• áˆ˜áˆ¨áŒƒ á‹­áˆáˆáŒ‹áˆ‰?`;
    }
  } else {
    if (lower.includes('bus') || lower.includes('trip') || lower.includes('find') || lower.includes('search') || lower.includes('schedule')) {
      reply = 'To find available buses across Ethiopia in Ethio Trip, please specify:\n1. **Departure City** (e.g., Addis Ababa, Bahir Dar, Hawassa, Gondar, Dire Dawa)\n2. **Destination City**\n3. **Travel Date**\n\nYou can also use the **Bus Search** feature to compare schedules, prices, and seats for Selam Bus, Sky Bus, and Zemen Bus!';
    } else if (lower.includes('book') || lower.includes('seat')) {
      if (!isLoggedIn) {
        reply = 'In the Ethio Trip system, you must be logged in to your passenger account to book seats or tickets. Please log in or register an account first. Once logged in, you can select your seat on the interactive bus layout!';
      } else {
        reply = `Hello ${passengerName}! To book a seat: search your trip on the Search page, click "Select Seats" to choose your preferred seats on our interactive layout, and proceed to checkout with Chapa or Telebirr/CBE Birr!`;
      }
    } else if (lower.includes('pay') || lower.includes('payment') || lower.includes('chapa') || lower.includes('telebirr')) {
      reply = 'Ethio Trip supports two secure payment methods for passengers:\n1. **Chapa**: Instant online payment (Telebirr, CBE Birr, cards). Your booking and active QR ticket are confirmed automatically.\n2. **Direct Telebirr / CBE Birr**: Pay externally and upload your payment receipt in the Payment Center. Company Staff will verify the receipt and issue your active ticket!';
    } else if (lower.includes('cancel') || lower.includes('refund')) {
      reply = "You can request a cancellation and refund from your Passenger Dashboard under Booking History. The refundable amount is calculated based on each operator's deadline policy (typically 80% to 90% refund if cancelled 12-24 hours prior to departure).";
    } else if (lower.includes('ticket') || lower.includes('qr') || lower.includes('download')) {
      reply = 'Once payment is verified, your active digital e-ticket is available immediately in Passenger Dashboard â†’ My Tickets. It contains a unique QR code for bus terminal boarding.';
    } else {
      reply = `Hello ${isLoggedIn ? passengerName : ''}! I am your Ethio Trip Passenger Assistant. I can help you search bus schedules across Ethiopia, check available seats, explain Chapa/Telebirr payments, and guide you through ticket downloads and cancellations in this system. How can I help you today?`;
    }
  }

  return {
    reply,
    source: 'ethiotrip_passenger_engine',
    extractedSearch: origin && destination ? { origin, destination, date, passengers } : null,
  };
};

module.exports = { askAssistant };
