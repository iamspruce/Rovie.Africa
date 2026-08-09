import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusTimeline } from '../viz/StatusTimeline';
import type { RecordedState, Sample } from '../../lib/statusHistory';

const START = 1_800_000_000_000;
const MINUTE = 60_000;

function at(minutes: number, state: RecordedState = 'operational', latencyMs = 120): Sample {
  return { at: START + minutes * MINUTE, state, latencyMs };
}

describe('StatusTimeline', () => {
  it('says so when there is nothing to draw yet', () => {
    render(<StatusTimeline samples={[]} label="Model gateway" />);
    expect(screen.getByText(/no checks recorded yet/i)).toBeInTheDocument();
  });

  it('draws one cell per check, each naming its own state and time', () => {
    render(<StatusTimeline samples={[at(0), at(1, 'degraded'), at(2, 'down')]} label="Gateway" />);

    // Every cell is a real hit target with its own label - the strip must not
    // depend on colour, or on landing a hover, to be readable.
    expect(screen.getAllByRole('button')).toHaveLength(3);
    expect(screen.getByRole('button', { name: /operational/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /slow/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /not responding/i })).toBeInTheDocument();
  });

  // The height encoding is the reason the strip works for a reader who cannot
  // separate the amber from the red - which the palette check says is a real
  // share of them. Colour alone would not carry it.
  it('encodes state as height as well as colour', () => {
    const { container } = render(
      <StatusTimeline samples={[at(0), at(1, 'degraded'), at(2, 'down')]} label="Gateway" />
    );

    const heights = [...container.querySelectorAll('button > span')].map(
      (mark) => (mark as HTMLElement).style.height
    );

    expect(heights).toEqual(['30%', '62%', '100%']);
  });

  it('summarises the window when nothing is hovered', () => {
    render(<StatusTimeline samples={[at(0), at(1), at(2, 'down')]} label="Gateway" />);
    expect(screen.getByText(/2 operational, 0 slow, 1 not responding/i)).toBeInTheDocument();
  });

  describe('gaps in checking', () => {
    // One cell is one check and adjacency reads as "a minute apart". That
    // stops being true whenever checking paused - a hidden tab, a closed
    // laptop - and without a break drawn, an outage that ended overnight
    // reads as one that just ended.
    it('marks a break where checks stopped', () => {
      render(
        <StatusTimeline samples={[at(0), at(1), at(240), at(241)]} label="Gateway" />
      );

      const gap = screen.getByLabelText(/gap: no checks for 4 hours/i);
      expect(gap).toBeInTheDocument();
    });

    it('draws no break for checks that merely ran a little late', () => {
      const late: Sample = { at: START + MINUTE * 2 + 20_000, state: 'operational', latencyMs: 120 };
      render(<StatusTimeline samples={[at(0), at(1), late]} label="Gateway" />);

      expect(screen.queryByLabelText(/gap: no checks/i)).not.toBeInTheDocument();
    });

    it('describes a short break in minutes', () => {
      render(<StatusTimeline samples={[at(0), at(9)]} label="Gateway" />);
      expect(screen.getByLabelText(/gap: no checks for 9 minutes/i)).toBeInTheDocument();
    });
  });

  // Every service reserves the same number of cells so the columns line up
  // between strips, whatever each one's own history length.
  it('pads a short history so it stays aligned with a longer one', () => {
    const { container } = render(
      <StatusTimeline samples={[at(0), at(1)]} label="Gateway" slots={6} />
    );

    expect(container.querySelectorAll('button')).toHaveLength(2);
    // Four blanks ahead of them, not four more cells.
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(4);
  });

  it('shows only the newest checks when the history is longer than the strip', () => {
    const samples = Array.from({ length: 20 }, (_, i) => at(i));
    render(<StatusTimeline samples={samples} label="Gateway" slots={5} />);

    expect(screen.getAllByRole('button')).toHaveLength(5);
  });
});
