import React, { useState, useMemo } from 'react';
import { FaSearch, FaSpinner, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { useTranslation } from '../i18n';

const DataTable = ({
  columns = [],
  data = [],
  loading = false,
  searchPlaceholder = 'Search records...',
  searchTerm: controlledSearch,
  onSearchChange: controlledSetSearch,
  searchable = true,
  actions = null,
  emptyMessage = 'No matching records found.',
  pageSize = 10,
  cardTitle = null,
}) => {
  const { t } = useTranslation();
  const [internalSearch, setInternalSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const isControlled = controlledSearch !== undefined && controlledSetSearch !== undefined;
  const activeSearch = isControlled ? controlledSearch : internalSearch;
  const handleSearchChange = (val) => {
    if (isControlled) {
      controlledSetSearch(val);
    } else {
      setInternalSearch(val);
    }
    setCurrentPage(1);
  };

  const filteredData = useMemo(() => {
    if (isControlled || !activeSearch.trim()) return data;
    const q = activeSearch.toLowerCase();
    return data.filter((item) => {
      return Object.values(item).some((val) => {
        if (val == null) return false;
        if (typeof val === 'object') {
          return Object.values(val).some((sub) => sub != null && String(sub).toLowerCase().includes(q));
        }
        return String(val).toLowerCase().includes(q);
      });
    });
  }, [data, activeSearch, isControlled]);

  const totalPages = pageSize > 0 ? Math.ceil(filteredData.length / pageSize) : 1;
  const paginatedData = useMemo(() => {
    if (pageSize <= 0) return filteredData;
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  return (
    <div className="w-full space-y-3">
      {}
      {(searchable || actions || cardTitle) && (
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          {cardTitle && (
            <div className="text-sm font-bold text-slate-800 dark:text-slate-200 tracking-wide">
              {typeof cardTitle === 'string' ? t(cardTitle, cardTitle) : cardTitle}
            </div>
          )}
          {searchable && (
            <div className="relative flex items-center min-w-[240px] max-w-sm">
              <FaSearch className="absolute left-3 text-slate-400 text-xs pointer-events-none" />
              <input
                type="text"
                placeholder={t(searchPlaceholder, searchPlaceholder)}
                value={activeSearch}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 transition-all shadow-sm"
              />
            </div>
          )}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}

      {}
      <div className="bg-white dark:bg-[#0d1b14] rounded-2xl shadow-sm border border-slate-200 dark:border-[#1e352b] overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400 text-xs">
            <FaSpinner className="animate-spin text-emerald-600 text-xl" />
            <span>{t('Loading records...', 'Loading records...')}</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-slate-900 to-slate-800 text-white">
                  {columns.map((col, idx) => (
                    <th
                      key={idx}
                      style={{ ...(col.thStyle || {}), width: col.width || 'auto' }}
                      className="px-4 py-3.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-200"
                    >
                      {typeof col.header === 'string' ? t(col.header, col.header) : col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#1e352b]">
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-8 text-center text-xs text-slate-400 font-medium">
                      {t(emptyMessage, emptyMessage)}
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((row, rowIdx) => (
                    <tr
                      key={row._id || row.id || rowIdx}
                      className="hover:bg-emerald-50/40 dark:hover:bg-[#142a20] transition-colors"
                    >
                      {columns.map((col, colIdx) => (
                        <td
                          key={colIdx}
                          style={col.style || {}}
                          className="px-4 py-3.5 text-xs text-slate-700 dark:text-slate-300 align-middle"
                        >
                          {col.render
                            ? col.render(row, rowIdx)
                            : col.accessor
                            ? row[col.accessor] ?? '—'
                            : '—'}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {}
        {!loading && filteredData.length > 0 && pageSize > 0 && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-[#1e352b] text-xs text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/40">
            <div>
              {t('showing', 'Showing')} {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredData.length)} / {filteredData.length}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <FaChevronLeft className="text-[10px]" />
              </button>
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <FaChevronRight className="text-[10px]" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataTable;
