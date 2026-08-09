import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from '../../components/Modal/Modal';

describe('Modal', () => {
  it('renders nothing when closed', () => {
    render(
      <Modal title="Test" isOpen={false} onClose={() => {}}>
        content
      </Modal>
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders its content and title when open', () => {
    render(
      <Modal title="Sign in" isOpen onClose={() => {}}>
        <p>form goes here</p>
      </Modal>
    );
    expect(screen.getByRole('dialog', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByText('form goes here')).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', async () => {
    const onClose = vi.fn();
    render(
      <Modal title="Sign in" isOpen onClose={onClose}>
        content
      </Modal>
    );
    await userEvent.click(screen.getByRole('button', { name: /close dialog/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the backdrop is clicked, but not when the dialog itself is clicked', async () => {
    const onClose = vi.fn();
    render(
      <Modal title="Sign in" isOpen onClose={onClose}>
        <p>inside</p>
      </Modal>
    );
    await userEvent.click(screen.getByText('inside'));
    expect(onClose).not.toHaveBeenCalled();

    await userEvent.click(screen.getByTestId('modal-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose on Escape', async () => {
    const onClose = vi.fn();
    render(
      <Modal title="Sign in" isOpen onClose={onClose}>
        content
      </Modal>
    );
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not steal focus back to the dialog when it re-renders with a new onClose reference (regression)', async () => {
    function Wrapper() {
      const [, setTick] = useState(0);
      return (
        <Modal title="Sign in" isOpen onClose={() => setTick((t) => t + 1)}>
          <input aria-label="test input" onChange={() => setTick((t) => t + 1)} />
        </Modal>
      );
    }
    render(<Wrapper />);
    const input = screen.getByLabelText('test input');
    await userEvent.type(input, 'abc');
    expect(input).toHaveValue('abc');
  });
});
