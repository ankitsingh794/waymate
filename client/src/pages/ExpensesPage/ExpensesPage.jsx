/**
 * Expenses Page
 * Manage and split trip expenses
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useParams } from 'react-router-dom';
import api from '../../utils/axiosInstance';
import {
  VscAdd,
  VscTrash,
  VscEdit,
  VscCreditCard,
  VscSplitHorizontal,
} from 'react-icons/vsc';
import { Card, CardHeader, CardBody, CardFooter, Button, Input, Alert, Badge } from '../../components/UI';
import DashboardNavbar from '../../components/DashboardNavbar';
import './ExpensesPage.css';

export default function ExpensesPage() {
  const { tripId } = useParams();
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [budget, setBudget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: 'Other',
    paidBy: user?._id,
    participants: [],
  });

  useEffect(() => {
    fetchExpenses();
  }, [tripId]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      if (tripId) {
        const response = await api.get(`/trips/${tripId}/expenses`);
        setExpenses(response.data.expenses || []);
        setBudget(response.data.budget);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const addExpense = async () => {
    if (!formData.description || !formData.amount) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      const endpoint = tripId
        ? `/trips/${tripId}/expenses`
        : '/expenses';

      const response = await api.post(endpoint, formData);
      setExpenses([...expenses, response.data.expense]);
      setFormData({
        description: '',
        amount: '',
        category: 'Other',
        paidBy: user?._id,
        participants: [],
      });
      setShowForm(false);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add expense');
    }
  };

  const deleteExpense = async (expenseId) => {
    if (!window.confirm('Are you sure?')) return;

    try {
      const endpoint = tripId
        ? `/trips/${tripId}/expenses/${expenseId}`
        : `/expenses/${expenseId}`;

      await api.delete(endpoint);
      setExpenses(expenses.filter(e => e._id !== expenseId));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete expense');
    }
  };

  const categories = ['Food', 'Transport', 'Accommodation', 'Activities', 'Shopping', 'Other'];
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const remaining = budget ? budget.totalBudget - totalExpenses : null;

  return (
    <div className="expenses-page">
      <DashboardNavbar />

      <div className="expenses-body">
        <div className="page-header">
          <h1>Expenses</h1>
          <p>Track and split trip costs</p>
        </div>

        {error && <Alert variant="error" closable onClose={() => setError(null)}>{error}</Alert>}

        <div className="expenses-container">
          {/* Budget Overview */}
          {budget && (
            <Card padding="lg" className="budget-card">
              <div className="budget-grid">
                <div className="budget-item">
                  <span className="budget-label">Total Budget</span>
                  <strong className="budget-amount">${budget.totalBudget.toFixed(2)}</strong>
                </div>
                <div className="budget-item">
                  <span className="budget-label">Spent</span>
                  <strong className="budget-amount" style={{ color: 'var(--color-error)' }}>
                    ${totalExpenses.toFixed(2)}
                  </strong>
                </div>
                <div className="budget-item">
                  <span className="budget-label">Remaining</span>
                  <strong className="budget-amount" style={{
                    color: remaining >= 0 ? 'var(--color-success)' : 'var(--color-error)'
                  }}>
                    ${remaining.toFixed(2)}
                  </strong>
                </div>
              </div>
              <div className="budget-bar">
                <div
                  className="budget-progress"
                  style={{
                    width: `${Math.min((totalExpenses / budget.totalBudget) * 100, 100)}%`
                  }}
                />
              </div>
            </Card>
          )}

          {/* Expenses List */}
          <div className="expenses-section">
            <div className="section-header">
              <h2>Expenses</h2>
              <Button variant="primary" icon={VscAdd} onClick={() => setShowForm(!showForm)}>
                Add Expense
              </Button>
            </div>

            {loading ? (
              <Card padding="lg">
                <p style={{ textAlign: 'center' }}>Loading expenses...</p>
              </Card>
            ) : expenses.length === 0 ? (
              <Card padding="lg" className="empty-state">
                <VscCreditCard className="empty-icon" />
                <h3>No Expenses Yet</h3>
                <p>Add expenses to track your spending</p>
              </Card>
            ) : (
              <div className="expenses-list">
                {expenses.map(expense => (
                  <Card key={expense._id} padding="md" className="expense-item">
                    <div className="expense-row">
                      <div className="expense-info">
                        <Badge variant="primary" size="sm">
                          {expense.category}
                        </Badge>
                        <div className="expense-details">
                          <strong>{expense.description}</strong>
                          <span className="expense-date">
                            {new Date(expense.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="expense-amount">
                        <strong>${expense.amount.toFixed(2)}</strong>
                      </div>

                      <div className="expense-actions">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={VscTrash}
                          onClick={() => deleteExpense(expense._id)}
                          style={{ color: 'var(--color-error)' }}
                        />
                      </div>
                    </div>

                    {expense.participants && expense.participants.length > 0 && (
                      <div className="expense-split">
                        <VscSplitHorizontal className="split-icon" />
                        <span>Split between {expense.participants.length} people</span>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Add Expense Form */}
          {showForm && (
            <Card padding="lg">
              <CardHeader title="Add New Expense" />
              <CardBody>
                <div className="form-grid">
                  <Input
                    label="Description"
                    placeholder="e.g., Dinner at restaurant"
                    value={formData.description}
                    onChange={e => setFormData({
                      ...formData,
                      description: e.target.value
                    })}
                    fullWidth
                  />
                  <Input
                    label="Amount"
                    type="number"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={e => setFormData({
                      ...formData,
                      amount: parseFloat(e.target.value) || ''
                    })}
                    fullWidth
                  />
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{
                      display: 'block',
                      marginBottom: 'var(--space-2)',
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 'var(--font-weight-medium)',
                    }}>
                      Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={e => setFormData({
                        ...formData,
                        category: e.target.value
                      })}
                      style={{
                        width: '100%',
                        padding: 'var(--space-3) var(--space-4)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-lg)',
                        fontFamily: 'var(--font-primary)',
                      }}
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardBody>
              <CardFooter>
                <Button variant="ghost" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={addExpense}>
                  Add Expense
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
