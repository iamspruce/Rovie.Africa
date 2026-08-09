import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GetStartedSteps } from '../GetStartedSteps/GetStartedSteps';
import { DOCS_URL } from '../../content/navLinks';

function renderSteps() {
  return render(
    <MemoryRouter>
      <GetStartedSteps />
    </MemoryRouter>
  );
}

describe('GetStartedSteps', () => {
  it('lists the three steps in the order they happen', () => {
    renderSteps();
    const steps = screen.getAllByRole('listitem').map((li) => li.textContent);
    expect(steps).toHaveLength(3);
    expect(steps[0]).toMatch(/sign up/i);
    expect(steps[1]).toMatch(/buy credits/i);
    expect(steps[2]).toMatch(/start using/i);
  });

  it('marks the sequence as ordered, since the steps depend on each other', () => {
    const { container } = renderSteps();
    expect(container.querySelector('ol')).toBeInTheDocument();
  });

  it('says what each step actually asks of you', () => {
    renderSteps();
    const [signUp, buy] = screen.getAllByRole('listitem');
    expect(within(signUp).getByText(/no card, no invite/i)).toBeInTheDocument();
    expect(within(buy).getByText(/naira, shillings or cedis/i)).toBeInTheDocument();
  });

  // The quickstart lives on docs.rovie.africa now, so this is an absolute URL
  // rather than a route. Asserted against DOCS_URL rather than a literal: the
  // point is that the CTA and the nav agree on where the docs are.
  it('sends the reader somewhere real to start', () => {
    renderSteps();
    expect(screen.getByRole('link', { name: /read the setup guide/i })).toHaveAttribute(
      'href',
      `${DOCS_URL}/start/quickstart/`
    );
  });

  it('keeps the step numbers out of the accessibility tree - the list already conveys order', () => {
    const { container } = renderSteps();
    const markers = container.querySelectorAll('[aria-hidden="true"]');
    expect(markers.length).toBeGreaterThanOrEqual(3);
  });
});
