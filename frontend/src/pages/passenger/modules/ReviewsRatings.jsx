import React, { useState, useEffect } from 'react';
import { FaStar, FaPaperPlane, FaBuilding } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { companyAPI, reviewAPI } from '../../../utils/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useTranslation } from '../../../i18n';

const ReviewsRatings = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reviewsList, setReviewsList] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      loadReviews(selectedCompanyId);
    }
  }, [selectedCompanyId]);

  const loadCompanies = async () => {
    try {
      const list = await companyAPI.getActiveCompanies();
      const validCompanies = Array.isArray(list) ? list : [];
      setCompanies(validCompanies);
      if (validCompanies.length > 0) {
        setSelectedCompanyId(validCompanies[0]._id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadReviews = async (compId) => {
    try {
      setLoadingReviews(true);
      const res = await reviewAPI.getByCompany(compId);
      const reviews = Array.isArray(res) ? res : res?.reviews || [];
      setReviewsList(reviews);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingReviews(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCompanyId) {
      toast.warning(t('reviews.selectOperator', 'Please select a bus company to review'));
      return;
    }
    if (!comment.trim()) {
      toast.warning(t('enter review message', 'Please enter a review message'));
      return;
    }

    setSubmitting(true);
    try {
      await reviewAPI.create({
        companyId: selectedCompanyId,
        rating,
        comment: comment.trim(),
      });
      toast.success(t('review submitted successfully', 'Thank you for rating your travel experience! Your review has been submitted.'));
      setComment('');
      setRating(5);
      loadReviews(selectedCompanyId);
    } catch (err) {
      toast.error(err.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCompany = companies.find((c) => c._id === selectedCompanyId);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm max-w-[750px] mx-auto">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-5">
        <div>
          <h3 className="m-0 text-[1.2rem] font-extrabold text-slate-900 dark:text-white">
            {t('reviews.title', 'Rate & Review Bus Operators')}
          </h3>
          <p className="m-0 mt-1 text-slate-500 dark:text-slate-400 text-[0.85rem]">
            {t('reviews.subtitle', 'Share authentic feedback on bus comfort, driver punctuality, and service quality')}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 mb-7">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div className="flex flex-col gap-1.5">
            <label className="block text-[0.82rem] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              {t('reviews.selectOperator', 'Select Bus Operator')}
            </label>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-[0.88rem] outline-none"
            >
              {companies.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.companyName} ({c.rating ? `★ ${c.rating}` : t('new', 'New')})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="block text-[0.82rem] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              {t('reviews.yourRating', 'Your Rating (1 to 5 Stars)')}
            </label>
            <select
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-[0.88rem] outline-none"
            >
              <option value="5">⭐⭐⭐⭐⭐ 5 - {t('excellent', 'Excellent')}</option>
              <option value="4">⭐⭐⭐⭐ 4 - {t('good', 'Good')}</option>
              <option value="3">⭐⭐⭐ 3 - {t('average', 'Average')}</option>
              <option value="2">⭐⭐ 2 - {t('poor', 'Poor')}</option>
              <option value="1">⭐ 1 - {t('very bad', 'Very Bad')}</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="block text-[0.82rem] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            {t('reviews.yourReview', 'Your Review & Feedback')}
          </label>
          <textarea
            rows="3"
            placeholder={t('reviews.reviewPlaceholder', 'Share your experience (punctuality, seat comfort, cleanliness, staff courtesy)...')}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-[0.88rem] font-inherit outline-none transition focus:border-emerald-500"
          />
        </div>

        <div>
          <button
            type="submit"
            disabled={submitting}
            className="bg-emerald-600 hover:bg-emerald-500 text-white border-none rounded-lg py-2.5 px-5 font-bold text-[0.88rem] flex items-center gap-2 cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <FaPaperPlane /> {submitting ? t('processing...', 'Submitting...') : t('reviews.submitReview', 'Submit Review')}
          </button>
        </div>
      </form>

      <div className="border-t border-slate-200 dark:border-slate-800 pt-5">
        <h4 className="m-0 mb-3.5 text-[0.98rem] font-extrabold text-slate-900 dark:text-white">
          {t('reviews.reviewsFor', 'Reviews for')} {selectedCompany?.companyName || t('operator', 'Operator')}
        </h4>

        {loadingReviews ? (
          <div className="p-5 text-center text-slate-500">
            {t('reviews.loadingReviews', 'Loading reviews...')}
          </div>
        ) : reviewsList.length === 0 ? (
          <div className="p-6 text-center text-slate-400 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800">
            {t('reviews.noReviewsYet', 'No reviews yet for this bus operator. Be the first to leave feedback!')}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {reviewsList.map((r) => {
              const reviewerName = r.user?.name || r.passenger || t('verified passenger', 'Verified Passenger');
              const dateStr = r.createdAt ? new Date(r.createdAt).toLocaleDateString() : r.date || t('recent', 'Recent');

              return (
                <div key={r._id || r.id} className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60">
                  <div className="flex justify-between items-center">
                    <div className="font-extrabold text-[0.88rem] text-slate-900 dark:text-white">
                      {reviewerName}
                    </div>
                    <div className="text-yellow-500 font-extrabold text-[0.9rem]">
                      {'★'.repeat(r.rating || 5)}{'☆'.repeat(5 - (r.rating || 5))}
                    </div>
                  </div>
                  <div className="text-[0.84rem] text-slate-700 dark:text-slate-300 mt-1.5 leading-relaxed">
                    {r.comment}
                  </div>
                  <div className="text-[0.72rem] text-slate-400 dark:text-slate-500 mt-2">
                    {dateStr}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewsRatings;
