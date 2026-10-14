

export const BOOKING_STATUS = Object.freeze({
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  RECEIPT_SUBMITTED: 'RECEIPT_SUBMITTED',
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED',
  REFUNDED: 'REFUNDED',
  EXPIRED: 'EXPIRED',
});

export const PAYMENT_STATUS = Object.freeze({
  INITIATED: 'INITIATED',
  PENDING: 'PENDING',
  PENDING_RECEIPT: 'PENDING_RECEIPT',
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  PAID: 'PAID',
  FAILED: 'FAILED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
  REFUND_PENDING: 'REFUND_PENDING',
  REFUNDED: 'REFUNDED',
  EXPIRED: 'EXPIRED',
});

const upper = (value) => (value === null || value === undefined ? '' : String(value).trim().toUpperCase());


export const bookingStatus = (b) => upper(b?.status);


export const paymentStatus = (b) => upper(b?.paymentStatus ?? b?.payment_status);


export const nestedPaymentStatus = (b) => upper(b?.payment?.status);

export const isPaid = (b) => {
  const ps = paymentStatus(b) || nestedPaymentStatus(b);
  return ps === PAYMENT_STATUS.PAID || ps === 'COMPLETED' || ps === 'SUCCESS';
};

export const isPendingPayment = (b) => {
  const ps = paymentStatus(b) || nestedPaymentStatus(b);
  return [
    PAYMENT_STATUS.PENDING,
    PAYMENT_STATUS.INITIATED,
    PAYMENT_STATUS.PENDING_RECEIPT,
    PAYMENT_STATUS.PENDING_VERIFICATION,
  ].includes(ps);
};

export const isConfirmed = (b) => {
  const st = bookingStatus(b);
  return st === BOOKING_STATUS.CONFIRMED || st === BOOKING_STATUS.COMPLETED;
};

export const isCompleted = (b) => bookingStatus(b) === BOOKING_STATUS.COMPLETED;

export const isCancelled = (b) => {
  const st = bookingStatus(b);
  return st === BOOKING_STATUS.CANCELLED || st === BOOKING_STATUS.REFUNDED || st === BOOKING_STATUS.EXPIRED;
};

export const isRefunded = (b) => {
  const st = bookingStatus(b);
  const ps = paymentStatus(b);
  return st === BOOKING_STATUS.REFUNDED || ps === PAYMENT_STATUS.REFUNDED || ps === PAYMENT_STATUS.REFUND_PENDING;
};

export const isAwaitingPayment = (b) => {
  const st = bookingStatus(b);
  return (
    st === BOOKING_STATUS.PENDING_PAYMENT ||
    st === BOOKING_STATUS.RECEIPT_SUBMITTED ||
    st === BOOKING_STATUS.PENDING_VERIFICATION ||
    isPendingPayment(b)
  );
};


export const isRevenueBearing = (b) => isPaid(b) && !isCancelled(b);


export const hasActiveTicket = (b) =>
  isPaid(b) && (isConfirmed(b) || isCompleted(b)) && Boolean(b?.ticketNumber);


export const bookingSeats = (b) => {
  const seats = b?.selectedSeats ?? b?.outboundLeg?.seats ?? b?.seats;
  return Array.isArray(seats) ? seats : seats ? [seats] : [];
};


export const bookingAmount = (b) => Number(b?.totalPrice ?? b?.totalAmount ?? 0) || 0;


export const bookingRouteLabel = (b) => {
  const route = b?.outboundLeg?.route ?? b?.schedule?.route ?? b?.route;
  if (typeof route === 'string') return route;
  const from = route?.from ?? b?.outboundLeg?.schedule?.route?.from ?? b?.schedule?.route?.from ?? '';
  const to = route?.to ?? b?.outboundLeg?.schedule?.route?.to ?? b?.schedule?.route?.to ?? '';
  if (from && to) return `${from} → ${to}`;
  return from || to || '';
};


export const bookingTravelDate = (b) =>
  b?.outboundLeg?.date ?? b?.schedule?.date ?? b?.travelDate ?? null;


export const bookingDepartureTime = (b) =>
  b?.outboundLeg?.departureTime ?? b?.schedule?.departureTime ?? null;


export const todayDateString = () => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};


export const isUpcoming = (b) => {
  const date = bookingTravelDate(b);
  if (!date) return false;
  return String(date).slice(0, 10) >= todayDateString();
};