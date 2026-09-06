import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBus, FaSearch, FaShieldAlt, FaStar, FaUser, FaCheckCircle, FaFilter } from 'react-icons/fa';
import MainLayout from '../layouts/MainLayout';
import { busAPI } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../i18n.jsx';
import { toast } from 'react-toastify';

// Map bus company → local uploaded bus image
const COMPANY_BUS_IMAGES = {
  'Selam Bus Line': '/images/selam_bus.png',
  'Selam Bus': '/images/selam_bus.png',
  'Ethio Bus': '/images/ethio_bus.png',
  'Zemen Bus': '/images/zemen_bus.png',
  'Zemen Express': '/images/zemen_bus.png',
  'Abay Bus': '/images/abay_bus.png',
  'Abay Bus Transport': '/images/abay_bus.png',
  'Habesha Bus': '/images/habesha_bus.png',
  'Habesha Bus Express': '/images/habesha_bus.png',
};

const FALLBACK_BUSES = [
  {
    _id: 'b1',
    busNumber: 'Selam Luxury Coach (VIP-01)',
    plateNumber: '3-A10101-ET',
    type: 'VIP',
    capacity: 45,
    image: '/images/selam_bus.png',
    companyId: { companyName: 'Selam Bus Line', rating: 4.9, logo: '/logos/selam_bus.png' },
    status: 'active',
    features: ['WiFi', 'Air Conditioning', 'Leather Recliner', 'USB Charging'],
  },
  {
    _id: 'b2',
    busNumber: 'Ethio Express Liner',
    plateNumber: '3-B20202-ET',
    type: 'Luxury',
    capacity: 45,
    image: '/images/ethio_bus.png',
    companyId: { companyName: 'Ethio Bus', rating: 4.7, logo: '/logos/ethio_bus.png' },
    status: 'active',
    features: ['Air Conditioning', 'WiFi', 'USB Charging', 'Water'],
  },
  {
    _id: 'b3',
    busNumber: 'Zemen Star Executive',
    plateNumber: '3-C30303-ET',
    type: 'VIP',
    capacity: 45,
    image: '/images/zemen_bus.png',
    companyId: { companyName: 'Zemen Bus', rating: 4.8, logo: '/logos/zemen_bus.png' },
    status: 'active',
    features: ['WiFi', 'Air Conditioning', 'Coffee/Tea', 'Extra Legroom'],
  },
  {
    _id: 'b4',
    busNumber: 'Abay Standard Express',
    plateNumber: '3-D40404-ET',
    type: 'Standard',
    capacity: 45,
    image: '/images/abay_bus.png',
    companyId: { companyName: 'Abay Bus', rating: 4.5, logo: '/logos/abay_bus.png' },
    status: 'active',
    features: ['Air Conditioning', 'Water', 'USB Charging'],
  },
  {
    _id: 'b5',
    busNumber: 'Habesha Southern Liner',
    plateNumber: '3-E50505-ET',
    type: 'Luxury',
    capacity: 45,
    image: '/images/habesha_bus.png',
    companyId: { companyName: 'Habesha Bus', rating: 4.6, logo: '/logos/habesha_bus.png' },
    status: 'active',
    features: ['Air Conditioning', 'USB Charging', 'Water', 'TV'],
  },
];

const TYPE_COLORS = {
  VIP:      { bg: '#fef3c7', color: '#d97706' },
  Luxury:   { bg: '#ede9fe', color: '#7c3aed' },
  Executive:{ bg: '#e0e7ff', color: '#4338ca' },
  Standard: { bg: '#f1f5f9', color: '#475569' },
};

const BusesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('all');
  const [selectedCompany, setSelectedCompany] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadBuses = async () => {
      setLoading(true);
      try {
        const data = await busAPI.getPublic().catch(() => []);
        setBuses(data && data.length > 0 ? data : FALLBACK_BUSES);
      } catch {
        setBuses(FALLBACK_BUSES);
      } finally {
        setLoading(false);
      }
    };
    loadBuses();
  }, []);

  // Display all active buses without arbitrarily hiding multiple fleet vehicles per company
  const displayBuses = buses && buses.length > 0 ? buses : FALLBACK_BUSES;

  // Derive companies list for filter
  const companies = [...new Set(displayBuses.map(b => b.companyId?.companyName).filter(Boolean))];

  const filtered = displayBuses.filter(b => {
    const matchType    = selectedType    === 'all' || b.type === selectedType;
    const matchCompany = selectedCompany === 'all' || b.companyId?.companyName === selectedCompany;
    const matchSearch  = !searchQuery
      || b.busNumber?.toLowerCase().includes(searchQuery.toLowerCase())
      || (b.plateNumber && b.plateNumber.toLowerCase().includes(searchQuery.toLowerCase()))
      || b.companyId?.companyName?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchType && matchCompany && matchSearch;
  });

  const getBusImage = (bus) => {
    // If the bus has an uploaded image (Cloudinary or Base64 or URL), prioritize it!
    if (bus.image && bus.image.trim()) {
      return bus.image;
    }
    const compName = bus.companyId?.companyName;
    if (compName && COMPANY_BUS_IMAGES[compName]) {
      return COMPANY_BUS_IMAGES[compName];
    }
    const searchStr = `${bus.busNumber || ''} ${compName || ''}`.toLowerCase();
    if (searchStr.includes('selam')) return '/images/selam_bus.png';
    if (searchStr.includes('ethio')) return '/images/ethio_bus.png';
    if (searchStr.includes('zemen')) return '/images/zemen_bus.png';
    if (searchStr.includes('abay')) return '/images/abay_bus.png';
    if (searchStr.includes('habesha')) return '/images/habesha_bus.png';
    return '/images/selam_bus.png';
  };

  const handleBook = (bus) => {
    if (!user) { toast.info('Please log in to book a seat'); navigate('/login'); }
    else navigate('/passenger/dashboard');
  };

  return (
    <MainLayout>
      <div className="buses-page-container">

        {/* ── Hero ── */}
        <section className="buses-hero">
          <div className="buses-hero-content">
            <div className="buses-badge"><FaBus /> {t('home.pill', 'Inter-City Fleet Directory')}</div>
            <h1>{t('buses.title', 'Ethiopian Bus Fleet & Operators')}</h1>
            <p>{t('buses.subtitle', 'Browse luxury coaches, executive buses, and scheduled express vehicles across participating transport providers.')}</p>
          </div>
        </section>

        {/* ── Filters ── */}
        <section className="buses-filter-bar">
          <div className="buses-search-box">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder={t('common.search', 'Search bus name or operator...')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="buses-filter-group">
            <div className="filter-item">
              <label><FaFilter /> Type</label>
              <select value={selectedType} onChange={e => setSelectedType(e.target.value)}>
                <option value="all">All Types</option>
                <option value="VIP">VIP</option>
                <option value="Luxury">Luxury</option>
                <option value="Executive">Executive</option>
                <option value="Standard">Standard</option>
              </select>
            </div>

            <div className="filter-item">
              <label><FaBus /> Operator</label>
              <select value={selectedCompany} onChange={e => setSelectedCompany(e.target.value)}>
                <option value="all">All Companies</option>
                {companies.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </section>

        {/* ── Grid ── */}
        <section className="buses-grid-section">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#64748b', fontSize: '1rem' }}>
              <FaBus style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }} />
              <p>Loading bus fleet...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
              No buses found matching your search.
            </div>
          ) : (
            <div className="buses-grid">
              {filtered.map(bus => {
                const typeStyle = TYPE_COLORS[bus.type] || TYPE_COLORS.Standard;
                return (
                  <div key={bus._id} className="bus-card">

                    {/* ── Bus Image ── */}
                    <div className="bus-card-image-wrap">
                      <img
                        src={getBusImage(bus)}
                        alt={`${bus.companyId?.companyName || 'Bus'} – ${bus.busNumber}`}
                        className="bus-card-image"
                        onError={e => { e.target.src = '/images/selam_bus.png'; }}
                      />
                      <span
                        className="bus-type-badge"
                        style={{ background: typeStyle.bg, color: typeStyle.color }}
                      >
                        {bus.type}
                      </span>
                    </div>

                    {/* ── Card Body ── */}
                    <div className="bus-card-body">
                      <div className="bus-company-tag">
                        <FaBus className="bus-icon" />
                        <span>{bus.companyId?.companyName || 'Inter-City Operator'}</span>
                      </div>

                      <h3>{bus.busNumber}</h3>
                      {bus.plateNumber && (
                        <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, marginTop: '-6px', marginBottom: '8px' }}>
                          Plate: <span style={{ color: '#0f172a', letterSpacing: '0.5px' }}>{bus.plateNumber}</span>
                        </div>
                      )}

                      <div className="bus-meta-row">
                        <span><FaUser /> {bus.capacity} Seats</span>
                        <span><FaShieldAlt style={{ color: '#16a34a' }} /> Verified</span>
                      </div>

                      <div className="bus-features-tags">
                        {(bus.features || bus.amenities || ['Air Conditioning', 'Reclining Seats']).slice(0, 4).map((f, i) => (
                          <span key={i} className="feature-pill"><FaCheckCircle /> {f}</span>
                        ))}
                      </div>
                    </div>

                    {/* ── Card Footer ── */}
                    <div className="bus-card-footer">
                      <div className="bus-rating">
                        <FaStar style={{ color: '#eab308' }} /> {bus.companyId?.rating || 4.8} / 5.0
                      </div>
                      <button className="btn-book-bus" onClick={() => handleBook(bus)}>
                        Book This Bus
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </section>

      </div>
    </MainLayout>
  );
};

export default BusesPage;
