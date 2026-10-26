import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBus, FaSearch, FaFilter } from 'react-icons/fa';
import MainLayout from '../layouts/MainLayout';
import { busAPI } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../i18n';

const COMPANY_BUS_IMAGES = {
  'Selam Bus Line': '/images/selam_bus.png',
  'Selam Bus': '/images/selam_bus.png',
  'Sky Bus': '/images/sky_bus_real.webp',
  'Sky Bus Line': '/images/sky_bus_real.webp',
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
    busNumber: 'Sky Express Coach',
    plateNumber: '3-B20202-ET',
    type: 'Luxury',
    capacity: 45,
    image: '/images/sky_bus_real.webp',
    companyId: { companyName: 'Sky Bus Line', rating: 4.8, logo: '/logos/sky_bus.png' },
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
  VIP:       'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300',
  Luxury:    'bg-purple-100 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300',
  Executive: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300',
  Standard:  'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
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

  const displayBuses = buses && buses.length > 0 ? buses : FALLBACK_BUSES;

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
    if (bus.image && bus.image.trim()) {
      return bus.image;
    }
    if (bus.companyId?.busImage && bus.companyId.busImage.trim()) {
      return bus.companyId.busImage;
    }
    const compName = bus.companyId?.companyName;
    if (compName && COMPANY_BUS_IMAGES[compName]) {
      return COMPANY_BUS_IMAGES[compName];
    }
    const searchStr = `${bus.busNumber || ''} ${compName || ''}`.toLowerCase();
    if (searchStr.includes('selam')) return '/images/selam_bus.png';
    if (searchStr.includes('sky')) return '/images/sky_bus_real.webp';
    if (searchStr.includes('ethio')) return '/images/sky_bus_real.webp';
    if (searchStr.includes('zemen')) return '/images/zemen_bus.png';
    if (searchStr.includes('abay')) return '/images/abay_bus.png';
    if (searchStr.includes('habesha')) return '/images/habesha_bus.png';
    return '/images/selam_bus.png';
  };

  const handleBook = (bus) => {
    if (!user) { navigate('/login'); }
    else navigate('/passenger/dashboard');
  };

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 font-poppins text-slate-900 dark:text-slate-100 transition-colors duration-200">

        {}
        <div className="flex items-center gap-3.5 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl shrink-0">
            <FaBus />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white m-0">
              {t('buses.title', 'Ethiopian Bus Fleet & Operators')}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 m-0 mt-0.5">
              {t('buses.subtitle', 'Browse luxury coaches, executive buses, and scheduled express vehicles across participating transport providers.')}
            </p>
          </div>
        </div>

        {}
        <section className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm mb-8">
          <div className="relative flex items-center w-full md:w-80">
            <FaSearch className="absolute left-3.5 text-slate-400 text-xs pointer-events-none" />
            <input
              type="text"
              placeholder={t('buses.searchPlaceholder', 'Search bus name or operator...')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
              <FaFilter className="text-emerald-600" />
              <span>{t('buses.type', 'Type')}</span>
              <select
                value={selectedType}
                onChange={e => setSelectedType(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white outline-none cursor-pointer"
              >
                <option value="all" className="dark:bg-slate-900">{t('buses.allTypes', 'All Types')}</option>
                <option value="VIP" className="dark:bg-slate-900">{t('buses.vip', 'VIP')}</option>
                <option value="Luxury" className="dark:bg-slate-900">{t('buses.luxury', 'Luxury')}</option>
                <option value="Executive" className="dark:bg-slate-900">{t('buses.executive', 'Executive')}</option>
                <option value="Standard" className="dark:bg-slate-900">{t('buses.standard', 'Standard')}</option>
              </select>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
              <FaBus className="text-emerald-600" />
              <span>{t('buses.operator', 'Operator')}</span>
              <select
                value={selectedCompany}
                onChange={e => setSelectedCompany(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white outline-none cursor-pointer"
              >
                <option value="all" className="dark:bg-slate-900">{t('buses.allCompanies', 'All Companies')}</option>
                {companies.map(c => <option key={c} value={c} className="dark:bg-slate-900">{c}</option>)}
              </select>
            </div>
          </div>
        </section>

        {}
        <section>
          {loading ? (
            <div className="text-center py-16 text-slate-400">
              <FaBus className="text-5xl mx-auto mb-3 opacity-30 animate-pulse" />
              <p className="text-sm font-semibold">{t('buses.loadingFleet', 'Loading bus fleet...')}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <p className="text-sm font-semibold">{t('buses.noBusesFound', 'No buses found matching your search.')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map(bus => {
                const typeStyle = TYPE_COLORS[bus.type] || TYPE_COLORS.Standard;
                return (
                  <div
                    key={bus._id}
                    className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between"
                  >
                    {}
                    <div className="relative h-52 bg-slate-900 overflow-hidden">
                      <img
                        src={getBusImage(bus)}
                        alt={`${bus.companyId?.companyName || 'Bus'} – ${bus.busNumber}`}
                        className="w-full h-full object-cover"
                        onError={e => { e.target.src = '/images/selam_bus.png'; }}
                      />
                      <span
                        className={`absolute top-3 right-3 text-xs font-extrabold px-2.5 py-1 rounded-full shadow-md ${typeStyle || 'bg-slate-100 text-slate-700'}`}
                      >
                        {t(`buses.${bus.type?.toLowerCase()}`, bus.type)}
                      </span>
                    </div>

                    {}
                    <div className="p-5">
                      <div className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg mb-3">
                        <FaBus />
                        <span>{bus.companyId?.companyName || 'Inter-City Operator'}</span>
                      </div>
                      <h3 className="text-base font-black text-slate-900 dark:text-white m-0">{bus.busNumber}</h3>
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
