import { Link } from 'react-router-dom';
import { useServiceHealth } from '../../hooks/useServiceHealth';
import { CONTACT_EMAIL } from '../../content/navLinks';
import styles from './Support.module.scss';

// encodeURIComponent, not URLSearchParams: the latter is form encoding, which
// writes a space as "+". Mail clients take that literally, so the subject line
// arrives reading "Top-up+not+credited".
function mailto(subject: string, body?: string): string {
  const parts = [`subject=${encodeURIComponent(subject)}`];
  if (body) parts.push(`body=${encodeURIComponent(body)}`);
  return `mailto:${CONTACT_EMAIL}?${parts.join('&')}`;
}

// Each route pre-fills the subject, and the ones we can't diagnose without
// detail pre-fill the questions too - so the first reply can be an answer
// rather than a request for more information.
const ROUTES = [
  {
    title: 'Something is broken',
    body: 'A call is failing, a page will not load, or a balance looks wrong.',
    action: 'Report a problem',
    href: mailto(
      'Problem report',
      [
        'What happened:',
        '',
        'What you expected instead:',
        '',
        'Model you were calling (if any):',
        '',
        'Roughly when it started:',
        '',
        'Error message, if there was one:',
        '',
      ].join('\n')
    ),
  },
  {
    title: 'A payment did not land',
    body: 'You paid, but the balance has not moved. Include the reference from your payment confirmation.',
    action: 'Chase a top-up',
    href: mailto(
      'Top-up not credited',
      [
        'Payment reference:',
        '',
        'Amount and currency:',
        '',
        'Approximate time of payment:',
        '',
        'Email or phone on the Rovie account:',
        '',
      ].join('\n')
    ),
  },
  {
    title: 'A key is exposed',
    body: 'Treat this as urgent. Revoke the key first, then tell us so we can watch for use of it.',
    action: 'Report an exposed key',
    href: mailto(
      'URGENT: exposed API key',
      [
        'Do NOT paste the key itself into this email.',
        '',
        'Last four characters of the key:',
        '',
        'Where it was exposed (repo, client app, log):',
        '',
        'When you noticed:',
        '',
      ].join('\n')
    ),
  },
  {
    title: 'Something else',
    body: 'A question about a model, a bill, a use case, or anything this page does not cover.',
    action: 'Email us',
    href: mailto('Question'),
  },
];

const ANSWERS = [
  {
    q: 'My call returns 401 or "invalid key".',
    a: 'The key is wrong, revoked, or being sent in the wrong header. Keys are shown once at creation and cannot be recovered — if you no longer have it, issue a new one rather than guessing.',
  },
  {
    q: 'I have credit, but calls are refused.',
    a: 'Check the balance directly rather than trusting a cached figure, and check that the model you are naming is still in the catalog. Providers withdraw models, and a withdrawn model fails even with credit behind it.',
  },
  {
    q: 'The price I was quoted is not the price I was charged.',
    a: 'Quotes convert at the market rate at the moment they are shown; the rate on a top-up is fixed when the payment confirms. Between those two moments, the market can move. Model rates can also change when the provider changes them.',
  },
  {
    q: 'My currency is not on the top-up list.',
    a: 'Settlement is limited to the currencies the Account Service supports, but Rovie still works everywhere else — pricing is shown in USD and your key behaves identically.',
  },
  {
    q: 'Is the problem me or you?',
    a: 'Open the status page. It runs the same requests this site depends on, live from your browser, and tells you which of them are answering.',
  },
];

export function Support() {
  // The same live probes the status page uses, so this page can answer "is it
  // down?" before anyone writes an email about it.
  const { overall, isChecking } = useServiceHealth();

  const systemsLine =
    overall === 'operational'
      ? 'All monitored systems are responding normally.'
      : overall === 'checking' || isChecking
        ? 'Checking systems…'
        : overall === 'degraded'
          ? 'Some systems are responding slowly right now.'
          : 'Something is not responding right now.';

  return (
    <main className={`container ${styles.page}`}>
      <header className={styles.head}>
        <span className={styles.eyebrow}>Support</span>
        <h1>Getting help</h1>
        <p className={styles.intro}>
          There is no ticket portal and no bot. Mail reaches a person, and the routes below
          pre-fill the details we would otherwise have to ask you for.
        </p>

        <p className={styles.systems} data-state={overall} role="status">
          <span className={styles.dot} aria-hidden="true" />
          {systemsLine} <Link to="/status">See the live checks</Link>
        </p>
      </header>

      <section className={styles.routes} aria-labelledby="routes-heading">
        <h2 id="routes-heading" className={styles.sectionHeading}>
          What do you need?
        </h2>

        <ul className={styles.routeList}>
          {ROUTES.map((route) => (
            <li key={route.title} className={styles.route}>
              <h3>{route.title}</h3>
              <p>{route.body}</p>
              <a className={styles.action} href={route.href}>
                {route.action}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.answers} aria-labelledby="answers-heading">
        <h2 id="answers-heading" className={styles.sectionHeading}>
          Answered already
        </h2>

        <div className={styles.answerList}>
          {ANSWERS.map((item) => (
            <details key={item.q} className={styles.answer}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
