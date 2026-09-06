import React, { useState, useMemo } from 'react';
import { FaSearch, FaSpinner, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

/**
 * Standardized Ultra-Modern Data Table Component
 * Used across all roles: Super Admin, Company Admin, Ticket Agent, and Passenger.
 *
 * @param {Array} columns - Array of { header, accessor, render, style, thStyle, width }
 * @param {Array} data - Array of row items
 * @param {boolean} loading - Loading state
 * @param {string} searchPlaceholder - Placeholder text for search bar
 * @param {string} searchTerm - Controlled search term (optional)
 * @param {function} onSearchChange - Controlled search change handler (optional)
 * @param {boolean} searchable - Show search toolbar (default: true)
 * @param {ReactNode} actions - Custom action buttons in the toolbar (e.g., "Add Item")
 * @param {string} emptyMessage - Message when no records match
 * @param {number} pageSize - Number of items per page (default: 10, set 0 for no pagination)
 * @param {string} cardTitle - Optional title inside card header
 */
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

  // If internal search is active and data is not already filtered externally
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

  // Pagination
  const totalPages = pageSize > 0 ? Math.ceil(filteredData.length / pageSize) : 1;
  const paginatedData = useMemo(() => {
    if (pageSize <= 0) return filteredData;
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  return (
    <div className="eb-datatable-container">
      {/* Top Toolbar */}
      {(searchable || actions || cardTitle) && (
        <div className="eb-table-toolbar">
          {cardTitle && <div className="eb-table-card-title">{cardTitle}</div>}
          {searchable && (
            <div className="eb-search-input-box">
              <FaSearch className="eb-search-icon" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={activeSearch}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
          )}
          {actions && <div className="eb-table-actions-slot">{actions}</div>}
        </div>
      )}

      {/* Modern Table Card */}
      <div className="eb-table-card">
        {loading ? (
          <div className="eb-table-loading">
            <FaSpinner className="eb-spin-icon" />
            <span>Loading records...</span>
          </div>
        ) : (
          <div className="eb-table-responsive-wrapper">
            <table className="eb-modern-table">
              <thead>
                <tr>
                  {columns.map((col, idx) => (
                    <th key={idx} style={{ ...(col.thStyle || {}), width: col.width || 'auto' }}>
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="eb-table-empty">
                      {emptyMessage}
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((row, rowIdx) => (
                    <tr key={row._id || row.id || rowIdx}>
                      {columns.map((col, colIdx) => (
                        <td key={colIdx} style={col.style || {}}>
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

        {/* Footer / Pagination */}
        {!loading && filteredData.length > 0 && pageSize > 0 && totalPages > 1 && (
          <div className="eb-table-pagination">
            <div className="eb-pagination-info">
              Showing {(currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length} entries
            </div>
            <div className="eb-pagination-controls">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="eb-page-btn"
              >
                <FaChevronLeft />
              </button>
              <span className="eb-page-indicator">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="eb-page-btn"
              >
                <FaChevronRight />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataTable;
