import React, { useState } from 'react';
import { FaStar, FaPaperPlane, FaSmile } from 'react-icons/fa';
import { toast } from 'react-toastify';

const ReviewsRatings = () => {
  const [form, setForm] = useState({
    company: 'selma Bus Line',
    rating: 5,
    comment: ''
  });

  const [reviewsList, setReviewsList] = useState([
    { id: 'r1', passenger: 'Meskerem Tadesse', company: 'Selam Bus Line', rating: 5, comment: 'Excellent bus, very comfortable seats and punctual departure!', date: '2024-05-18' },
    { id: 'r2', passenger: 'Abebe Bikila', company: 'Abay Bus Transport', rating: 4, comment: 'Good service and safe driver.', date: '2024-05-15' },
  ]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.comment.trim()) {
      toast.warn('Please enter a review message');
      return;
    }

    const newRev = {
      id: `r${Date.now()}`,
      passenger: 'You (Passenger)',
      company: form.company,
      rating: form.rating,
      comment: form.comment,
      date: new Date().toISOString().split('T')[0]
    };

    setReviewsList([newRev, ...reviewsList]);
    toast.success('Thank you for rating your travel experience!');
    setForm({ company: 'Selam Bus Line', rating: 5, comment: '' });
  };

  return (
    <div className="db-card-widget" style={{ maxWidth: 700 }}>
      <div className="db-card-header">
        <div>
          <h3>Rate & Review Bus Companies</h3>
          <p>Share feedback on bus comfort, driver safety, and service quality after completing your trip</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="form-group-field">
            <label>Bus Operator</label>
            <select value={form.company} onChange={e => setForm({ ...form, company: e.target.value })}>
              <option value="Selam Bus Line">Selam Bus Line</option>
              <option value="Abay Bus Transport">Abay Bus Transport</option>
              <option value="Habesha Bus Express">Habesha Bus Express</option>
            </select>
          </div>

          <div className="form-group-field">
            <label>Rating (1 to 5 Stars)</label>
            <select value={form.rating} onChange={e => setForm({ ...form, rating: Number(e.target.value) })}>
              <option value="5">⭐⭐⭐⭐⭐ 5 - Excellent</option>
              <option value="4">⭐⭐⭐⭐ 4 - Good</option>
              <option value="3">⭐⭐⭐ 3 - Average</option>
              <option value="2">⭐⭐ 2 - Poor</option>
              <option value="1">⭐ 1 - Very Bad</option>
            </select>
          </div>
        </div>

        <div className="form-group-field">
          <label>Your Review & Feedback</label>
          <textarea
            rows="3"
            placeholder="Write your review here..."
            value={form.comment}
            onChange={e => setForm({ ...form, comment: e.target.value })}
            style={{ padding: 10, borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
          />
        </div>

        <div>
          <button type="submit" className="btn-primary-role purple">
            <FaPaperPlane /> Submit Review
          </button>
        </div>
      </form>

      {/* Community Reviews List */}
      <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', fontWeight: 800 }}>Recent Community Ratings</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {reviewsList.map(r => (
          <div key={r.id} style={{ padding: 14, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>{r.passenger} - <span style={{ color: '#7c3aed' }}>{r.company}</span></div>
              <div style={{ color: '#eab308', fontWeight: 700 }}>{'⭐'.repeat(r.rating)}</div>
            </div>
            <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: 4 }}>{r.comment}</div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 6 }}>{r.date}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReviewsRatings;
