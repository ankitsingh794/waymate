import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  VscAdd,
  VscArrowLeft,
  VscCheck,
  VscClose,
  VscCreditCard,
  VscPieChart,
  VscSplitHorizontal,
  VscTrash,
} from 'react-icons/vsc';
import {
  FaBed,
  FaCar,
  FaCartShopping,
  FaMoneyBillTransfer,
  FaTicket,
  FaUtensils,
} from 'react-icons/fa6';
import DashboardNavbar from '../../components/DashboardNavbar';
import TripSubNav from '../TripPage/TripSubNav';
import { Alert, Badge, Button, Loading, useConfirm } from '../../components/UI';
import api from '../../utils/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import './ExpensesPage.css';

const CATEGORIES = [
  { id: 'Food', label: 'Food & Dining', icon: FaUtensils },
  { id: 'Transport', label: 'Transit & Rides', icon: FaCar },
  { id: 'Accommodation', label: 'Stays & Hotels', icon: FaBed },
  { id: 'Activities', label: 'Tours & Sights', icon: FaTicket },
  { id: 'Shopping', label: 'Shopping', icon: FaCartShopping },
  { id: 'Other', label: 'Miscellaneous', icon: FaMoneyBillTransfer },
];

function getCategoryIcon(catName) {
  const matched = CATEGORIES.find(
    (c) => c.id.toLowerCase() === (catName || '').toLowerCase()
  );
  if (matched) return matched.icon;
  return FaMoneyBillTransfer;
}

export default function ExpensesPage() {
  const { id, tripId } = useParams();
  const effectiveTripId = id || tripId;
  const { user } = useAuth();
  const confirm = useConfirm();

  const [trip, setTrip] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [budget, setBudget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [filterCategory, setFilterCategory] = useState('All');

  // Form State
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: 'Food',
    paidBy: user?._id || '',
    participants: [],
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchExpensesAndTrip = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (effectiveTripId) {
        const [expRes, tripRes] = await Promise.all([
          api.get(`/trips/${effectiveTripId}/expenses`),
          api.get(`/trips/${effectiveTripId}`).catch(() => null),
        ]);

        const list = expRes?.data?.expenses || expRes?.data?.data?.expenses || [];
        setExpenses(Array.isArray(list) ? list : []);
        setBudget(expRes?.data?.budget || expRes?.data?.data?.budget || null);

        const tripData = tripRes?.data?.data?.trip || tripRes?.data?.trip || null;
        if (tripData) {
          setTrip(tripData);
        }
      } else {
        const response = await api.get('/expenses');
        const list = response?.data?.expenses || response?.data?.data || [];
        setExpenses(Array.isArray(list) ? list : []);
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load expense ledger.');
    } finally {
      setLoading(false);
    }
  }, [effectiveTripId]);

  useEffect(() => {
    fetchExpensesAndTrip();
  }, [fetchExpensesAndTrip]);

  // Squad members from trip group
  const members = useMemo(() => {
    const list = trip?.group?.members;
    if (Array.isArray(list) && list.length > 0) return list;
    return [];
  }, [trip?.group?.members]);

  const totalExpenses = useMemo(() => {
    return expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  }, [expenses]);

  const totalBudget = useMemo(() => {
    if (budget?.totalBudget) return Number(budget.totalBudget);
    if (trip?.budget?.estimatedTotal) return Number(trip.budget.estimatedTotal);
    if (typeof trip?.budget === 'number') return trip.budget;
    return 0;
  }, [budget, trip]);

  const remainingBudget = totalBudget > 0 ? totalBudget - totalExpenses : null;
  const burnPercent = totalBudget > 0 ? Math.min((totalExpenses / totalBudget) * 100, 100) : 0;

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    if (filterCategory === 'All') return expenses;
    return expenses.filter(
      (e) => (e.category || '').toLowerCase() === filterCategory.toLowerCase()
    );
  }, [expenses, filterCategory]);

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!formData.description.trim() || !formData.amount) {
      setError('Please provide a description and an amount.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const endpoint = effectiveTripId
        ? `/trips/${effectiveTripId}/expenses`
        : '/expenses';

      const payload = {
        description: formData.description.trim(),
        amount: parseFloat(formData.amount),
        category: formData.category,
        paidBy: formData.paidBy || user?._id,
        participants: formData.participants,
      };

      const response = await api.post(endpoint, payload);
      const saved = response?.data?.expense || response?.data?.data?.expense;

      if (saved) {
        setExpenses((prev) => [saved, ...prev]);
      } else {
        fetchExpensesAndTrip();
      }

      setFormData({
        description: '',
        amount: '',
        category: 'Food',
        paidBy: user?._id || '',
        participants: [],
      });
      setShowFormModal(false);
      setSuccessMsg('Expense logged successfully.');
      setTimeout(() => setSuccessMsg(''), 3500);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to record expense.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    const isConfirmed = await confirm({
      title: 'Remove Expense',
      message: 'Are you sure you want to delete this expense record from the trip ledger?',
      confirmLabel: 'Delete Expense',
      variant: 'error',
    });

    if (!isConfirmed) return;

    try {
      const endpoint = effectiveTripId
        ? `/trips/${effectiveTripId}/expenses/${expenseId}`
        : `/expenses/${expenseId}`;

      await api.delete(endpoint);
      setExpenses((prev) => prev.filter((item) => item._id !== expenseId));
      setSuccessMsg('Expense removed from ledger.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to delete expense.');
    }
  };

  return (
    <div className="expenses-page">
      <DashboardNavbar />

      {/* Atmospheric Ambient Glow */}
      <div className="expenses-ambient" aria-hidden="true">
        <div className="expenses-orb expenses-orb-1" />
        <div className="expenses-orb expenses-orb-2" />
      </div>

      <main className="expenses-shell">
        {/* Top Breadcrumb Link (if inside a trip) */}
        {effectiveTripId && (
          <div className="expenses-top-nav">
            <Link to={`/trip/${effectiveTripId}`} className="expenses-back-link">
              <VscArrowLeft />
              <span>Back to {trip?.destination || 'Trip'} Overview</span>
            </Link>
          </div>
        )}

        {/* Trip Sub Navigation Dock */}
        {effectiveTripId && <TripSubNav activeTab="expenses" />}

        {/* Page Header */}
        <header className="expenses-hero-header">
          <div className="expenses-title-group">
            <div className="expenses-eyebrow">
              <span className="live-pulse-dot" />
              <span>FINANCIAL LEDGER & SQUAD BUDGET</span>
            </div>
            <h1>
              {trip?.destination ? `${trip.destination} Expense Ledger` : 'Trip Expense Ledger'}
            </h1>
            <p>
              Real-time expenditure tracking, squad cost splitting, and automated budget burn rate for{' '}
              {trip?.destination || 'your journey'}.
            </p>
          </div>

          <div className="expenses-hero-actions">
            <button
              type="button"
              className="btn-log-expense"
              onClick={() => setShowFormModal(true)}
            >
              <VscAdd className="btn-icon" />
              <span>Log Expense</span>
            </button>
          </div>
        </header>

        {/* Banners */}
        {error && (
          <Alert variant="error" closable onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {successMsg && (
          <Alert variant="success" closable onClose={() => setSuccessMsg('')}>
            {successMsg}
          </Alert>
        )}

        {/* Budget Telemetry HUD Card */}
        {totalBudget > 0 && (
          <section className="expenses-budget-card">
            <div className="budget-metrics-grid">
              <div className="budget-metric">
                <span className="metric-label">Allocated Budget</span>
                <strong className="metric-val metric-val--gold">
                  ${totalBudget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </strong>
                <span className="metric-sub">Trip Estimate</span>
              </div>

              <div className="budget-metric">
                <span className="metric-label">Cumulative Spend</span>
                <strong className="metric-val metric-val--spent">
                  ${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </strong>
                <span className="metric-sub">{expenses.length} recorded items</span>
              </div>

              <div className="budget-metric">
                <span className="metric-label">Remaining Balance</span>
                <strong
                  className={`metric-val ${
                    remainingBudget !== null && remainingBudget >= 0
                      ? 'metric-val--positive'
                      : 'metric-val--negative'
                  }`}
                >
                  ${(remainingBudget || 0).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </strong>
                <span className="metric-sub">
                  {remainingBudget !== null && remainingBudget >= 0
                    ? `${(100 - burnPercent).toFixed(0)}% available`
                    : 'Over budget'}
                </span>
              </div>

              <div className="budget-metric budget-metric--status">
                <span className="metric-label">Burn Telemetry</span>
                <div className="burn-badge">
                  <VscPieChart />
                  <span>{burnPercent.toFixed(0)}% Burned</span>
                </div>
              </div>
            </div>

            {/* Glowing Multi-segment Progress Bar */}
            <div className="budget-track-wrap">
              <div
                className={`budget-track-fill ${
                  burnPercent > 90 ? 'is-danger' : burnPercent > 70 ? 'is-warning' : ''
                }`}
                style={{ width: `${burnPercent}%` }}
              />
            </div>
          </section>
        )}

        {/* Filter Chips Bar */}
        <div className="expenses-filter-bar">
          <div className="filter-chips-list">
            <button
              type="button"
              className={`filter-chip ${filterCategory === 'All' ? 'is-active' : ''}`}
              onClick={() => setFilterCategory('All')}
            >
              All Categories ({expenses.length})
            </button>
            {CATEGORIES.map((cat) => {
              const count = expenses.filter(
                (e) => (e.category || '').toLowerCase() === cat.id.toLowerCase()
              ).length;
              return (
                <button
                  key={cat.id}
                  type="button"
                  className={`filter-chip ${filterCategory === cat.id ? 'is-active' : ''}`}
                  onClick={() => setFilterCategory(cat.id)}
                >
                  <cat.icon className="chip-icon" />
                  <span>
                    {cat.label} ({count})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Expense Items List */}
        <section className="expenses-feed">
          {loading ? (
            <div className="expenses-loading-state">
              <Loading
                size="lg"
                label="Calculating squad financials..."
                sublabel="Syncing live expense ledger and split settlements"
                dark
              />
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="expenses-empty-card">
              <div className="empty-icon-wrap">
                <VscCreditCard />
              </div>
              <h3>No Expenses Recorded Yet</h3>
              <p>
                Keep your squad on budget. Log fuel, dining, accommodation, or tour passes and
                split costs automatically.
              </p>
              <button
                type="button"
                className="btn-log-expense"
                onClick={() => setShowFormModal(true)}
              >
                <VscAdd />
                <span>Log First Expense</span>
              </button>
            </div>
          ) : (
            <div className="expenses-grid">
              {filteredExpenses.map((expense) => {
                const CatIcon = getCategoryIcon(expense.category);
                const dateStr = new Date(expense.createdAt || Date.now()).toLocaleDateString(
                  undefined,
                  {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  }
                );

                return (
                  <article key={expense._id} className="expense-card">
                    <div className="expense-card-left">
                      <div className="expense-cat-badge">
                        <CatIcon />
                      </div>
                      <div className="expense-details">
                        <h4 className="expense-desc">{expense.description}</h4>
                        <div className="expense-meta-row">
                          <span className="expense-cat-name">{expense.category}</span>
                          <span className="expense-meta-dot">·</span>
                          <span className="expense-date">{dateStr}</span>
                          {expense.paidBy && (
                            <>
                              <span className="expense-meta-dot">·</span>
                              <span className="expense-payer">
                                Paid by{' '}
                                {typeof expense.paidBy === 'object'
                                  ? expense.paidBy.name || 'Traveler'
                                  : 'Squad Member'}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="expense-card-right">
                      <div className="expense-price-wrap">
                        <strong className="expense-price">
                          ${Number(expense.amount).toFixed(2)}
                        </strong>
                        {expense.participants && expense.participants.length > 0 && (
                          <span className="expense-split-tag">
                            <VscSplitHorizontal /> Split by {expense.participants.length}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        className="btn-expense-delete"
                        onClick={() => handleDeleteExpense(expense._id)}
                        title="Delete expense"
                        aria-label="Delete expense"
                      >
                        <VscTrash />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Modal: Log New Expense */}
        {showFormModal && (
          <div
            className="expense-modal-backdrop"
            onClick={() => setShowFormModal(false)}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="expense-modal-card"
              onClick={(e) => e.stopPropagation()}
            >
              <header className="expense-modal-header">
                <div className="modal-title-group">
                  <VscCreditCard className="modal-title-icon" />
                  <h3>Log Squad Expense</h3>
                </div>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setShowFormModal(false)}
                >
                  <VscClose />
                </button>
              </header>

              <form onSubmit={handleAddExpense} className="expense-modal-form">
                <div className="form-group">
                  <label htmlFor="exp-desc">Expense Description</label>
                  <input
                    id="exp-desc"
                    type="text"
                    required
                    placeholder="e.g. Seafood Dinner at Fisherman's Wharf"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label htmlFor="exp-amount">Amount (USD $)</label>
                    <input
                      id="exp-amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={(e) =>
                        setFormData({ ...formData, amount: e.target.value })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="exp-category">Expense Category</label>
                    <select
                      id="exp-category"
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value })
                      }
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {members.length > 0 && (
                  <div className="form-group">
                    <label>Split between Squad Members</label>
                    <div className="squad-split-chips">
                      {members.map((m, idx) => {
                        const mId = m.userId?._id || m.userId || String(idx);
                        const mName = m.userId?.name || m.name || `Traveler #${idx + 1}`;
                        const isSelected = formData.participants.includes(mId);

                        return (
                          <button
                            key={mId}
                            type="button"
                            className={`split-member-chip ${isSelected ? 'is-selected' : ''}`}
                            onClick={() => {
                              setFormData((prev) => ({
                                ...prev,
                                participants: isSelected
                                  ? prev.participants.filter((p) => p !== mId)
                                  : [...prev.participants, mId],
                              }));
                            }}
                          >
                            <span className="chip-check">
                              {isSelected ? <VscCheck /> : null}
                            </span>
                            <span>{mName}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <footer className="expense-modal-footer">
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => setShowFormModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-submit"
                    disabled={submitting}
                  >
                    {submitting ? 'Recording...' : 'Add to Ledger'}
                  </button>
                </footer>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
