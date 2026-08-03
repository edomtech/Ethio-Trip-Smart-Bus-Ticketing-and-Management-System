import React from 'react';
import { Link } from 'react-router-dom';
import {
  FaBus, FaShieldAlt, FaUsers, FaLightbulb,
  FaCheckCircle, FaAward, FaRoute, FaArrowRight,
  FaHeart, FaStar, FaCog, FaCrown, FaChair
} from 'react-icons/fa';
import MainLayout from '../layouts/MainLayout';
import './AboutPage.css';

const AboutPage = () => {
  return (
    <MainLayout>
      <div className="eb-about-page">
        
        {/* ══ HERO SECTION ══ */}
        <section className="eb-ab-hero">
          <div className="eb-ab-hero-container">
            <div className="eb-ab-hero-left">
              <h1 className="eb-ab-hero-title">
                About <span className="eb-text-green">Ethio Bus</span>
              </h1>
              <h3 className="eb-ab-hero-subtitle">Moving Ethiopia Forward</h3>
              <p className="eb-ab-hero-desc">
                Ethio Bus is dedicated to providing safe, reliable and comfortable travel across Ethiopia. We connect cities, communities and people with trust and commitment.
              </p>

              {/* 3 Metric Pills */}
              <div className="eb-ab-stats-grid">
                <div className="eb-ab-stat-card">
                  <div className="eb-ab-stat-icon"><FaBus /></div>
                  <div className="eb-ab-stat-info">
                    <h4>100+</h4>
                    <p>Buses</p>
                  </div>
                </div>

                <div className="eb-ab-stat-card">
                  <div className="eb-ab-stat-icon"><FaRoute /></div>
                  <div className="eb-ab-stat-info">
                    <h4>50+</h4>
                    <p>Routes</p>
                  </div>
                </div>

                <div className="eb-ab-stat-card">
                  <div className="eb-ab-stat-icon"><FaUsers /></div>
                  <div className="eb-ab-stat-info">
                    <h4>100K+</h4>
                    <p>Happy Passengers</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="eb-ab-hero-right">
              <div className="eb-ab-bus-frame">
                <img
                  src="/images/hero_bus.jpg"
                  alt="Ethio Bus Fleet"
                  className="eb-ab-hero-img"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=1000&auto=format&fit=crop';
                  }}
                />
              </div>
            </div>
          </div>

          {/* SVG Wave Bottom */}
          <div className="eb-ab-wave-divider">
            <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0,32L60,42.7C120,53,240,75,360,80C480,85,600,75,720,58.7C840,43,960,21,1080,16C1200,11,1320,21,1380,26.7L1440,32L1440,120L1380,120C1320,120,1200,120,1080,120C960,120,840,120,720,120C600,120,480,120,360,120C240,120,120,120,60,120L0,120Z" fill="#09111e"></path>
            </svg>
          </div>
        </section>

        {/* ══ OUR MISSION SECTION ══ */}
        <section className="eb-ab-mission-section">
          <div className="eb-ab-container">
            <div className="eb-ab-mission-grid">
              
              {/* Left Column: Heading & Text & Image */}
              <div className="eb-ab-mission-left">
                <h2 className="eb-ab-section-title">
                  Our <span className="eb-text-green">Mission</span>
                </h2>
                <p className="eb-ab-mission-text">
                  To revolutionize bus travel in Ethiopia by delivering exceptional service, embracing technology and ensuring every journey is safe, comfortable and on time.
                </p>
                <div className="eb-ab-mission-img-wrap">
                  <img
                    src="/images/bahir_dar.jpg"
                    alt="Bus Traveling in Ethiopia"
                    className="eb-ab-mission-img"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?q=80&w=1000&auto=format&fit=crop';
                    }}
                  />
                </div>
              </div>

              {/* Right Column: Mission Feature Items */}
              <div className="eb-ab-mission-right">
                <div className="eb-ab-feat-item">
                  <div className="eb-ab-fi-icon">
                    <FaShieldAlt />
                  </div>
                  <div className="eb-ab-fi-content">
                    <h4>Safety First</h4>
                    <p>We prioritize the safety of our passengers and crew on every journey.</p>
                  </div>
                </div>

                <div className="eb-ab-feat-item">
                  <div className="eb-ab-fi-icon">
                    <FaUsers />
                  </div>
                  <div className="eb-ab-fi-content">
                    <h4>Customer Focused</h4>
                    <p>Your satisfaction is our top priority. We listen, care and improve every day.</p>
                  </div>
                </div>

                <div className="eb-ab-feat-item">
                  <div className="eb-ab-fi-icon">
                    <FaLightbulb />
                  </div>
                  <div className="eb-ab-fi-content">
                    <h4>Innovation</h4>
                    <p>We use modern technology to make booking and traveling easier for everyone.</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ══ OUR VALUES SECTION ══ */}
        <section className="eb-ab-values-section">
          <div className="eb-ab-container">
            <h2 className="eb-ab-section-title">
              Our <span className="eb-text-green">Values</span>
            </h2>

            <div className="eb-ab-values-grid">
              <div className="eb-ab-val-card">
                <div className="eb-ab-vc-icon">
                  <FaShieldAlt />
                </div>
                <h3>Integrity</h3>
                <p>We operate with honesty and transparency.</p>
              </div>

              <div className="eb-ab-val-card">
                <div className="eb-ab-vc-icon">
                  <FaAward />
                </div>
                <h3>Reliability</h3>
                <p>We keep our promises and deliver on time.</p>
              </div>

              <div className="eb-ab-val-card">
                <div className="eb-ab-vc-icon">
                  <FaHeart />
                </div>
                <h3>Respect</h3>
                <p>We respect our customers, employees and partners.</p>
              </div>

              <div className="eb-ab-val-card">
                <div className="eb-ab-vc-icon">
                  <FaCrown />
                </div>
                <h3>Excellence</h3>
                <p>We strive for excellence in everything we do.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ══ CTA BANNER SECTION ══ */}
        <section className="eb-ab-cta-section">
          <div className="eb-ab-container">
            <div className="eb-ab-cta-card">
              <div className="eb-ab-cta-icon-badge">
                <FaChair />
              </div>
              <div className="eb-ab-cta-text">
                <h2>Comfortable. Reliable. Always With You.</h2>
                <p>Join thousands of happy passengers who trust Ethio Bus for their everyday travel.</p>
              </div>
              <Link to="/passenger/register" className="eb-ab-cta-btn">
                Book Your Ticket Now <FaArrowRight />
              </Link>
            </div>
          </div>
        </section>

      </div>
    </MainLayout>
  );
};

export default AboutPage;
