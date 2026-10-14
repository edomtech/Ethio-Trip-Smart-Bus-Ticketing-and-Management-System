

export function normalizeStatus(status) {
  if (!status) return 'pending';
  return String(status).toLowerCase().trim();
}

export function getStatusBadgeClass(status) {
  const norm = normalizeStatus(status);
  switch (norm) {
    case 'active':
    case 'confirmed':
    case 'paid':
    case 'completed':
    case 'approved':
    case 'verified':
    case 'boarded':
      return 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    case 'pending':
    case 'in_progress':
    case 'reviewing':
      return 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800';
    case 'suspended':
    case 'cancelled':
    case 'rejected':
    case 'failed':
    case 'inactive':
      return 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800';
    default:
      return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
  }
}

export function getStatusLabel(status) {
  if (!status) return 'Unpaid';
  const norm = normalizeStatus(status);
  
  if (norm === 'confirmed' || norm === 'completed' || norm === 'active' || norm === 'approved') return 'Confirmed';
  if (norm === 'cancelled' || norm === 'rejected' || norm === 'expired') return 'Cancelled';
  
  if (norm === 'paid' || norm === 'success') return 'Paid';
  if (norm === 'unpaid' || norm === 'pending' || norm === 'initiated' || norm === 'failed') return 'Unpaid';
  if (norm === 'refunded' || norm === 'refund_pending') return 'Refunded';
  
  if (norm === 'boarded' || norm === 'boarding') return 'Boarding';
  if (norm === 'not_boarded' || norm === 'not_boarding' || norm === 'not boarding') return 'Not Boarding';

  return norm.charAt(0).toUpperCase() + norm.slice(1).replace(/_/g, ' ');
}
