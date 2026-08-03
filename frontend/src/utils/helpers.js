// ---- DATE & TIME HELPERS ----
export const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-ET', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
};

export const formatDateTime = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleString('en-ET', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatTime = (timeStr) => {
  if (!timeStr) return '-';
  const [hours, minutes] = timeStr.split(':');
  const h = parseInt(hours);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

// ---- CURRENCY HELPERS ----
export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return '-';
  return new Intl.NumberFormat('en-ET', {
    style: 'currency',
    currency: 'ETB',
    minimumFractionDigits: 0,
  }).format(amount);
};

// ---- STATUS HELPERS ----
export const getBookingStatusBadge = (status) => {
  const statusMap = {
    pending: { class: 'badge-warning', label: 'Pending' },
    confirmed: { class: 'badge-success', label: 'Confirmed' },
    cancelled: { class: 'badge-danger', label: 'Cancelled' },
    completed: { class: 'badge-info', label: 'Completed' },
  };
  return statusMap[status] || { class: 'badge-primary', label: status };
};

export const getPaymentStatusBadge = (status) => {
  const statusMap = {
    pending: { class: 'badge-warning', label: 'Pending' },
    completed: { class: 'badge-success', label: 'Paid' },
    failed: { class: 'badge-danger', label: 'Failed' },
    refunded: { class: 'badge-info', label: 'Refunded' },
  };
  return statusMap[status] || { class: 'badge-primary', label: status };
};

// ---- VALIDATION HELPERS ----
export const validateEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const validatePhone = (phone) => {
  // Ethiopian phone format: +251XXXXXXXXX or 09XXXXXXXX
  return /^(\+251|0)[79]\d{8}$/.test(phone);
};

export const validatePassword = (password) => {
  return password.length >= 6;
};

// ---- TICKET NUMBER GENERATOR ----
export const generateTicketNumber = () => {
  const prefix = 'ETH';
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}-${timestamp}-${random}`;
};

// ---- SEAT HELPERS ----
export const getSeatRows = (totalSeats) => {
  const rows = [];
  const seatsPerRow = 4;
  for (let i = 0; i < totalSeats; i += seatsPerRow) {
    rows.push(Array.from({ length: Math.min(seatsPerRow, totalSeats - i) }, (_, j) => i + j + 1));
  }
  return rows;
};

// ---- LOCAL STORAGE HELPERS ----
export const saveToLocalStorage = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

export const getFromLocalStorage = (key) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return null;
  }
};

// ---- ETHIOPIAN CITIES ----
export const ethiopianCities = [
  'Addis Ababa',
  'Dire Dawa',
  'Mekelle',
  'Gondar',
  'Hawassa',
  'Bahir Dar',
  'Dessie',
  'Jimma',
  'Jijiga',
  'Shashamane',
  'Bishoftu (Debre Zeit)',
  'Sodo (Wolaita)',
  'Arba Minch',
  'Hosaena',
  'Harar',
  'Nekemte',
  'Debre Birhan',
  'Adama (Nazreth)',
  'Gambela',
  'Assosa',
];



