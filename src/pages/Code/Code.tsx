import { ROUTE_URL } from '../../content/navLinks';
import styles from './Code.module.scss';

export function Code() {
  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.eyebrow}>A Rovie product · In development</span>
        <h1>Rovie Code</h1>
        <p>
          A home for AI coding agents: the models, project context, and developer tools they need,
          brought into one focused workflow.
        </p>
      </header>

      <section className={styles.promise} aria-labelledby="code-promise-heading">
        <h2 id="code-promise-heading">Agents should understand the work they are joining.</h2>
        <p>
          Rovie Code is being designed for developers who want AI agents to work with their code,
          not around it. It will begin with tools such as OpenCode and grow into a more capable
          environment for choosing models, carrying context, and moving work forward.
        </p>
      </section>

      <section className={styles.next} aria-labelledby="code-next-heading">
        <span className={styles.eyebrow}>Available today</span>
        <h2 id="code-next-heading">Build with Rovie Route while Code is in development.</h2>
        <a href={ROUTE_URL} className={styles.action}>
          Explore Rovie Route <span aria-hidden="true">→</span>
        </a>
      </section>
    </main>
  );
}
