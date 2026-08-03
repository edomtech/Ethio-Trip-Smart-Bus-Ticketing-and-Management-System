import React, { useState } from 'react';
import {
  FaPhoneAlt, FaEnvelope, FaClock, FaMapMarkerAlt,
  FaPaperPlane, FaHeadset, FaCommentDots
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import MainLayout from '../layouts/MainLayout';
import './ContactPage.css';

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      toast.success('Thank you! Your message has been sent successfully.');
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
      setLoading(false);
    }, 600);
  };

  return (
    <MainLayout>
      <div className="eb-contact-page">

        {/* ══ HERO BANNER ══ */}
        <section className="eb-ct-hero">
          <div className="eb-ct-hero-container">
            <div className="eb-ct-hero-left">
              <h1 className="eb-ct-hero-title">
                Contact <span className="eb-text-yellow">Us</span>
              </h1>
              <p className="eb-ct-hero-subtitle">
                We'd love to hear from you. Reach out to us for inquiries, support or feedback.
              </p>

              {/* 3 Quick Info Pills */}
              <div className="eb-ct-pills-row">
                <div className="eb-ct-pill">
                  <FaPhoneAlt className="eb-ct-pill-icon" />
                  <span>+251 900 123 456</span>
                </div>

                <div className="eb-ct-pill">
                  <FaEnvelope className="eb-ct-pill-icon" />
                  <span>info@ethiobus.com</span>
                </div>

                <div className="eb-ct-pill">
                  <FaClock className="eb-ct-pill-icon" />
                  <span>Mon - Sun: 6AM - 10PM</span>
                </div>
              </div>
            </div>

            <div className="eb-ct-hero-right">
              <div className="eb-ct-bus-frame">
                <img
                  src="/images/hero_bus.jpg"
                  alt="Ethio Bus Contact"
                  className="eb-ct-hero-img"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=1000&auto=format&fit=crop';
                  }}
                />
              </div>
            </div>
          </div>

          {/* Wavy Divider */}
          <div className="eb-ct-wave-divider">
            <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0,32L60,42.7C120,53,240,75,360,80C480,85,600,75,720,58.7C840,43,960,21,1080,16C1200,11,1320,21,1380,26.7L1440,32L1440,120L1380,120C1320,120,1200,120,1080,120C960,120,840,120,720,120C600,120,480,120,360,120C240,120,120,120,60,120L0,120Z" fill="#ffffff"></path>
            </svg>
          </div>
        </section>

        {/* ══ MAIN CONTENT (Get in Touch & Offices) ══ */}
        <section className="eb-ct-content-section">
          <div className="eb-ct-container">
            <div className="eb-ct-split-grid">

              {/* LEFT COLUMN: Contact Form */}
              <div className="eb-ct-form-wrap">
                <h2 className="eb-ct-section-title">
                  Get <span className="eb-text-green">in Touch</span>
                </h2>

                <form onSubmit={handleSubmit} className="eb-ct-form">
                  <div className="eb-ct-fg">
                    <input
                      type="text"
                      placeholder="Your Name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="eb-ct-fg">
                    <input
                      type="email"
                      placeholder="Email Address"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>

                  <div className="eb-ct-fg">
                    <input
                      type="tel"
                      placeholder="Phone Number"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>

                  <div className="eb-ct-fg">
                    <input
                      type="text"
                      placeholder="Subject"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      required
                    />
                  </div>

                  <div className="eb-ct-fg">
                    <textarea
                      rows={4}
                      placeholder="Message"
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      required
                    />
                  </div>

                  <button type="submit" className="eb-ct-submit-btn" disabled={loading}>
                    {loading ? 'Sending...' : 'Send Message'} <FaPaperPlane />
                  </button>
                </form>
              </div>

              {/* RIGHT COLUMN: Our Offices */}
              <div className="eb-ct-offices-wrap">
                <h2 className="eb-ct-section-title">
                  Our <span className="eb-text-green">Offices</span>
                </h2>

                <div className="eb-ct-offices-list">
                  {/* Addis Ababa */}
                  <div className="eb-ct-office-card">
                    <div className="eb-ct-oc-icon">
                      <FaMapMarkerAlt />
                    </div>
                    <div className="eb-ct-oc-info">
                      <h4>Addis Ababa (Head Office)</h4>
                      <p>Bole Road, Near Friendship Square, Addis Ababa, Ethiopia</p>
                      <span className="eb-ct-oc-phone">
                        <FaPhoneAlt /> +251 900 123 456
                      </span>
                    </div>
                    <div className="eb-ct-oc-map-badge">
                      <span>📌 Addis Ababa</span>
                    </div>
                  </div>

                  {/* Dire Dawa */}
                  <div className="eb-ct-office-card">
                    <div className="eb-ct-oc-icon">
                      <FaMapMarkerAlt />
                    </div>
                    <div className="eb-ct-oc-info">
                      <h4>Dire Dawa Office</h4>
                      <p>Dire Dawa City Administration, Dire Dawa, Ethiopia</p>
                      <span className="eb-ct-oc-phone">
                        <FaPhoneAlt /> +251 912 345 678
                      </span>
                    </div>
                    <div className="eb-ct-oc-map-badge">
                      <span>📌 Dire Dawa</span>
                    </div>
                  </div>

                  {/* Hawassa */}
                  <div className="eb-ct-office-card">
                    <div className="eb-ct-oc-icon">
                      <FaMapMarkerAlt />
                    </div>
                    <div className="eb-ct-oc-info">
                      <h4>Hawassa Office</h4>
                      <p>SNNPR Region, Hawassa City, Hawassa, Ethiopia</p>
                      <span className="eb-ct-oc-phone">
                        <FaPhoneAlt /> +251 911 234 567
                      </span>
                    </div>
                    <div className="eb-ct-oc-map-badge">
                      <span>📌 Hawassa</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ══ 24/7 SUPPORT BANNER ══ */}
        <section className="eb-ct-help-section">
          <div className="eb-ct-container">
            <div className="eb-ct-help-card">
              <div className="eb-ct-hc-left">
                <h2>We are here to help!</h2>
                <p>Our customer support team is available 24/7 to assist you with your booking and travel needs.</p>
              </div>

              <div className="eb-ct-hc-right">
                <div className="eb-ct-badge-247">
                  <span>24/7</span>
                </div>
                <div className="eb-ct-chat-bubble">
                  <FaCommentDots />
                </div>
                <div className="eb-ct-agent-illus">
                  <FaHeadset />
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>
    </MainLayout>
  );
};

export default ContactPage;
