import { Link } from 'react-router-dom';
import styles from './GetStartedSteps.module.scss';

// A real sequence - you cannot spend credit you haven't bought, or buy credit
// without an account - so these are numbered. The numbers carry order the
// reader needs, rather than decorating three unrelated cards.
const STEPS = [
  {
    title: 'Sign up',
    body: 'An email address and your country. No card, no invite, nothing to approve.',
    detail: 'You get one API key back.',
  },
  {
    title: 'Buy credits',
    body: 'Top up in naira, shillings or cedis with the payment methods you already use.',
    detail: 'Your balance is held against your key.',
  },
  {
    title: 'Start using',
    body: 'Point any OpenAI-compatible tool at Rovie and pick a model.',
    detail: 'Every model in the catalog, one key.',
  },
];

export function GetStartedSteps() {
  return (
    <section className={styles.steps} aria-labelledby="steps-heading">
      <div className={styles.head}>
        <span className={styles.eyebrow}>Getting started</span>
        <h2 id="steps-heading">Three steps to your first call</h2>
      </div>

      <ol className={styles.list}>
        {STEPS.map((step, index) => (
          <li key={step.title} className={styles.step}>
            <span className={styles.index} aria-hidden="true">
              {index + 1}
            </span>
            <div className={styles.body}>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
              <p className={styles.detail}>{step.detail}</p>
            </div>
          </li>
        ))}
      </ol>

      <Link className={styles.start} to="/docs">
        Read the setup guide
      </Link>
    </section>
  );
}
