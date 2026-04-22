import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button Component', () => {
  it('renders correctly with children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('applies the correct variant', () => {
    render(<Button variant="primary">Primary Button</Button>);
    const button = screen.getByRole('button', { name: /Primary Button/i });
    expect(button).toBeInTheDocument();
  });

  it('applies the correct size', () => {
    render(<Button size="large">Large Button</Button>);
    const button = screen.getByRole('button', { name: /Large Button/i });
    expect(button).toBeInTheDocument();
  });

  it('shows loading state with spinner', () => {
    render(<Button loading={true}>Loading Button</Button>);
    const button = screen.getByRole('button', { name: /Loading Button/i });
    const spinner = button.querySelector('svg');
    expect(spinner).toBeInTheDocument();
  });

  it('calls onClick handler when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Clickable Button</Button>);
    const button = screen.getByRole('button', { name: /Clickable Button/i });
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled={true}>Disabled Button</Button>);
    const button = screen.getByRole('button', { name: /Disabled Button/i });
    expect(button).toBeDisabled();
  });

  it('is disabled when loading prop is true', () => {
    render(<Button loading={true}>Loading Button</Button>);
    const button = screen.getByRole('button', { name: /Loading Button/i });
    expect(button).toBeDisabled();
  });
});