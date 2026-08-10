// -----------------------------------------------------------------------
// The quotes flanking the hero.
//
// PLACEHOLDER COPY. Every name, role and sentence below is written, not
// collected - they exist so the layout can be built and reviewed against
// realistic measure. Replace them with real, attributable quotes before this
// ships to anyone: a testimonial is a claim about a person, and an invented
// one is the kind that gets a launch written about for the wrong reason.
//
// `avatarUrl` is the swap point for real photographs. While it is absent the
// card draws the person's initials instead, so there is never a broken image
// and never a stock face standing in for a customer who doesn't exist.
//
// ORDER IS THE ENTRANCE ORDER. The cards arrive one at a time in the sequence
// written here, and `side` decides which rail each one lands in - so keeping
// the sides alternating is what makes them arrive left, right, left, right
// rather than filling one column and then the other.
// -----------------------------------------------------------------------

export interface Testimonial {
  id: string;
  /** Who said it. Also the source of the initials when there's no photo. */
  name: string;
  /** Role and city, shown small under the name. */
  role: string;
  /** What they said. The card draws the quotation marks - don't include them. */
  quote: string;
  /** A real photograph, once there is one. Initials are used until then. */
  avatarUrl?: string;
  side: 'left' | 'right';
}

export const TESTIMONIALS: readonly Testimonial[] = [
  {
    id: 'adaeze',
    name: 'Adaeze Okonkwo',
    role: 'Founder · Lagos',
    quote: 'We were budgeting in naira and paying in dollars. Rovie was the first bill that made sense to my accountant.',
    side: 'left',
  },
  {
    id: 'kwame',
    name: 'Kwame Mensah',
    role: 'CTO · Accra',
    quote: 'One key, every frontier model. We stopped writing adapters and went back to writing the product.',
    side: 'right',
  },
  {
    id: 'fatima',
    name: 'Fatima Bello',
    role: 'Data lead · Kano',
    quote: 'No card, no US entity, no waiting on a support ticket to be allowed to spend money.',
    side: 'left',
  },
  {
    id: 'tendai',
    name: 'Tendai Moyo',
    role: 'Independent developer · Harare',
    quote: 'I can see what a request costs before I ship it. That number used to be a surprise at the end of the month.',
    side: 'right',
  },
  {
    id: 'amina',
    name: 'Amina Diallo',
    role: 'Product engineer · Dakar',
    quote: 'Latency from Dakar stopped being the reason we shipped the smaller model.',
    side: 'left',
  },
  {
    id: 'sipho',
    name: 'Sipho Ndlovu',
    role: 'Engineering lead · Johannesburg',
    quote: 'We moved four services over in an afternoon. The SDK behaved exactly like the one we were leaving.',
    side: 'right',
  },
];

/**
 * The initials drawn when a testimonial has no photograph - first and last
 * word of the name, so "Adaeze Okonkwo" reads as AO.
 */
export function initialsFor(name: string): string {
  const words = name.trim().split(/\s+/);
  const first = words[0]?.[0] ?? '';
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}
