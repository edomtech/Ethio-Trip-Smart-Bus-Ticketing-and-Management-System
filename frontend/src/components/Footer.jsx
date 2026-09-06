import { Link } from 'react-router-dom';
import { FaBus, FaPhoneAlt, FaEnvelope, FaMapMarkerAlt, FaFacebook, FaTelegram, FaTwitter, FaArrowRight } from 'react-icons/fa';
const Footer = () => (
  <footer className="eb-footer">
    <div className="eb-footer-inner">
      <div className="eb-footer-grid">

        <div className="eb-fg-brand">
          <div className="eb-footer-logo">
            <div className="eb-footer-logo-icon"><FaBus /></div>
            <div>
              <div className="eb-footer-logo-name">ETHIO<span>TRIP</span></div>
              <div className="eb-footer-logo-sub">Smart Bus Travel Platform</div>
            </div>
          </div>
          <p>Ethiopia's leading bus ticketing platform — safe, affordable and reliable inter-city travel.</p>
          <div className="eb-footer-social">
            <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook"><FaFacebook /></a>
            <a href="https://telegram.org"  target="_blank" rel="noreferrer" aria-label="Telegram"><FaTelegram /></a>
            <a href="https://twitter.com"   target="_blank" rel="noreferrer" aria-label="Twitter"><FaTwitter /></a>
          </div>
        </div>

        <div className="eb-fg-col">
          <h4>Navigation</h4>
          <a href="/"><FaArrowRight className="eb-link-arrow" /> Home</a>
          <a href="/#popular-routes"><FaArrowRight className="eb-link-arrow" /> Popular Routes</a>
          <Link to="/about"><FaArrowRight className="eb-link-arrow" /> About Us</Link>
          <Link to="/contact"><FaArrowRight className="eb-link-arrow" /> Contact Us</Link>
        </div>



        <div className="eb-fg-col">
          <h4>Contact</h4>
          <div className="eb-footer-contact-item">
            <FaPhoneAlt />
            <div>
              <span className="lbl">Phone</span>
              <strong>+251 11 123 4567</strong>
            </div>
          </div>
          <div className="eb-footer-contact-item">
            <FaEnvelope />
            <div>
              <span className="lbl">Email</span>
              <strong>support@ethiotrip.com</strong>
            </div>
          </div>
          <div className="eb-footer-contact-item">
            <FaMapMarkerAlt />
            <div>
              <span className="lbl">Office</span>
              <strong>Meskel Square, Addis Ababa</strong>
            </div>
          </div>
        </div>

      </div>

      <div className="eb-footer-bottom">
        <div className="eb-flag-bar">
          <span style={{ background: '#059669' }} />
          <span style={{ background: '#fbbf24' }} />
          <span style={{ background: '#ef4444' }} />
        </div>
        <p>© {new Date().getFullYear()} Ethio Trip. All Rights Reserved.</p>
        <div className="eb-flag-bar">
          <span style={{ background: '#059669' }} />
          <span style={{ background: '#fbbf24' }} />
          <span style={{ background: '#ef4444' }} />
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
