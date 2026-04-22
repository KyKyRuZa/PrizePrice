import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from './Input';

describe('Input Component', () => {
  it('renders correctly with label and input', () => {
    render(<Input label="Test Label" />);
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
  });

  it('displays the required indicator when required prop is true', () => {
    render(<Input label="Required Field" required={true} />);
    expect(screen.getByText(/Required Field/)).toBeInTheDocument();
  });

  it('updates value when user types', () => {
    render(<Input label="Test Input" />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'New Value' } });
    expect(input.value).toBe('New Value');
  });

  it('disables input when disabled prop is true', () => {
    render(<Input label="Disabled Input" disabled={true} />);
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
  });

  it('shows error message when error prop is provided', () => {
    render(<Input label="Error Input" error="This is an error" />);
    expect(screen.getByText('This is an error')).toBeInTheDocument();
  });

  it('applies correct type attribute', () => {
    render(<Input label="Password Input" type="password" />);
    const inputs = document.querySelectorAll('input');
    const passwordInput = Array.from(inputs).find(input => input.type === 'password');
    expect(passwordInput).toBeDefined();
  });
});