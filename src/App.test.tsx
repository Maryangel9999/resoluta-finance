import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';
import { summarizeMovements } from './utils/finance';

describe('Finance summary', () => {
  it('should calculate realized and estimated values based on movements', () => {
    const result = summarizeMovements([
      { amount: 2000, type: 'income', status: 'paid' },
      { amount: 500, type: 'income', status: 'pending' },
      { amount: 1200, type: 'expense', status: 'paid' },
      { amount: 300, type: 'expense', status: 'pending' },
    ]);

    expect(result.revenueReceived).toBe(2000);
    expect(result.pendingIncome).toBe(500);
    expect(result.costsPaid).toBe(1200);
    expect(result.pendingExpenses).toBe(300);
    expect(result.realized).toBe(800);
    expect(result.estimated).toBe(1000);
  });
});

describe('App rendering', () => {
  it('renders the dashboard title', () => {
    render(<App />);
    expect(screen.getByText(/Visão geral financeira/i)).toBeInTheDocument();
  });
});
