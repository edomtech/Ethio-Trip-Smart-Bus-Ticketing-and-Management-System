import { useState, useEffect, useMemo } from 'react';
import {
  FaEnvelope, FaUser, FaPaperPlane, FaSearch,
  FaExclamationCircle, FaCheckCircle,
} from 'react-icons/fa';
import { bookingAPI, notificationAPI } from '../../../utils/api';
import { useNotification } from '../../../contexts/NotificationContext';
import { useTranslation } from '../../../i18n';

const MAX_SUBJECT = 120;
const MAX_MESSAGE = 2000;

const AgentCommunications = () => {
  const { t } = useTranslation();
  const notify = useNotification();

  const [passengers, setPassengers] = useState([]);
  const [loadingPassengers, setLoadingPassengers] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const res = await bookingAPI.getAll({ limit: 500 });
        const rows = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];

        const map = new Map();
        rows.forEach((booking) => {
          const p = booking?.passenger;
          const email = p?.email;
          if (!email) return;
          const key = email.toLowerCase();
          if (!map.has(key)) {
            map.set(key, {
              email: key,
              name: p.name || 'Passenger',
              phone: p.phone || '',
              bookings: 0,
            });
          }
          map.get(key).bookings += 1;
        });

        if (active) setPassengers([...map.values()]);
      } catch {
        if (active) {
          notify.notifyError(
            { message: t('agent.couldNotLoadPax', 'Could not load passengers') },
            {
              title: t('agent.couldNotLoadPax', 'Could not load passengers'),
              description: t('agent.refreshAndTryAgain', 'Please refresh the page and try again.'),
            }
          );
        }
      } finally {
        if (active) setLoadingPassengers(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [notify, t]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return passengers;
    return passengers.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.email.includes(q) ||
        (p.phone || '').includes(q)
    );
  }, [passengers, search]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!selected) return setError(t('agent.selectPaxFirst', 'Please select a passenger.'));
    if (!subject.trim()) return setError(t('agent.enterSubject', 'Please enter a subject.'));
    if (!message.trim()) return setError(t('agent.enterMessage', 'Please enter a message.'));

    setSending(true);
    setSent(false);

    try {
      await notificationAPI.sendPassengerEmail({
        passengerEmail: selected.email,
        subject: subject.trim(),
        message: message.trim(),
        bookingRef: '',
      });

      setSent(true);
      setSubject('');
      setMessage('');
      notify.success({
        title: t('agent.messageSentSuccess', 'Message sent successfully'),
        description: `${t('agent.paxNotifiedAt', 'The passenger was notified at')} ${selected.email}.`,
      });
    } catch (err) {
      const status = err?.status || err?.response?.status;
      const safeMessage =
        status === 503
          ? t('agent.emailNotConfigured', 'Email delivery is not configured yet. Please contact the platform administrator.')
          : status === 403
            ? t('agent.onlyMsgOwnPax', 'You can only message passengers who have a booking with your company.')
            : t('agent.msgCouldNotSend', 'The message could not be sent. Please try again.');

      setError(safeMessage);
      notify.error({ title: t('agent.msgNotSent', 'Message not sent'), description: safeMessage });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <FaEnvelope className="text-emerald-600" /> {t('agent.passengerMessages', 'Passenger Messages')}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {t('agent.passengerMessagesSub', 'Send messages, refund inquiries, trip updates and important notices to passengers of your company.')}
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <section className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <h2 className="font-semibold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
            <FaUser /> {t('agent.selectPassenger', 'Select Passenger')}
          </h2>

          <div className="relative mb-3">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('agent.searchNameEmailPhone', 'Search name, email or phone...')}
              className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="max-h-80 overflow-y-auto space-y-1">
            {loadingPassengers && (
              <p className="text-sm text-slate-500 py-4 text-center">{t('common.loading', 'Loading passengers...')}</p>
            )}

            {!loadingPassengers && filtered.length === 0 && (
              <p className="text-sm text-slate-500 py-4 text-center">
                {t('agent.noPaxFound', 'No passengers found.')}
              </p>
            )}

            {filtered.map((p) => (
              <button
                key={p.email}
                type="button"
                onClick={() => {
                  setSelected(p);
                  setError('');
                }}
                className={`w-full text-left px-3 py-2 rounded-lg border transition ${
                  selected?.email === p.email
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30'
                    : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <div className="text-sm font-medium text-slate-800 dark:text-slate-100">
                  {p.name}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 break-all">
                  {p.email}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {p.bookings} {t('booking.bookings', 'bookings')}
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="lg:col-span-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 sm:p-6">
          {selected ? (
            <div className="mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
              <div className="text-xs uppercase tracking-wide text-slate-400">{t('agent.to', 'To')}</div>
              <div className="font-medium text-slate-800 dark:text-white">{selected.name}</div>
              <div className="text-sm text-slate-500 dark:text-slate-400 break-all">
                {selected.email}
              </div>
            </div>
          ) : (
            <p className="mb-4 pb-4 border-b border-slate-200 dark:border-slate-700 text-sm text-slate-500">
              {t('agent.selectPaxInstruction', 'Select a passenger from the list to start a message.')}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                {t('agent.subject', 'Subject')}
              </label>
              <input
                type="text"
                value={subject}
                maxLength={MAX_SUBJECT}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={t('agent.subjectExample', 'Important Trip Information')}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <div className="text-right text-[11px] text-slate-400 mt-1">
                {subject.length}/{MAX_SUBJECT}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                {t('agent.message', 'Message')}
              </label>
              <textarea
                value={message}
                maxLength={MAX_MESSAGE}
                rows={7}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('agent.messagePlaceholder', 'Your departure time has been changed...')}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <div className="text-right text-[11px] text-slate-400 mt-1">
                {message.length}/{MAX_MESSAGE}
              </div>
            </div>

            {error && (
              <p className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
                <FaExclamationCircle className="mt-0.5" /> {error}
              </p>
            )}

            {sent && !error && (
              <p className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                <FaCheckCircle /> {t('agent.messageSentSuccess', 'Message sent successfully.')}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                  setSubject('');
                  setMessage('');
                  setError('');
                  setSent(false);
                }}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                type="submit"
                disabled={sending}
                className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-medium inline-flex items-center gap-2"
              >
                <FaPaperPlane />
                {sending ? t('common.sending', 'Sending...') : t('agent.sendMessage', 'Send Message')}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
};

export default AgentCommunications;