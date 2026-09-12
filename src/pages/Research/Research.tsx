import '@fontsource/borel/latin-400.css';
import { ROUTE_URL } from '../../content/navLinks';
import styles from './Research.module.scss';

const AREAS = [
  {
    title: 'Access and capability',
    body: 'How can useful AI reach more people without cost, infrastructure, or geography deciding who gets to participate?',
  },
  {
    title: 'Language and context',
    body: 'How should AI better understand the languages, knowledge, and everyday realities that shape life across Africa?',
  },
  {
    title: 'Responsible systems',
    body: 'How do we build and deploy AI in ways that are dependable, transparent, and worthy of the trust people place in it?',
  },
];

export function Research() {
  return (
    <main className={`container ${styles.page}`}>
      <header className={styles.head}>
        <span className={styles.eyebrow}>Rovie Research · In development</span>
        <h1>Research for AI that serves Africa.</h1>
        <p className={styles.thesis}>
          AI should expand what people can do. Rovie Research studies how to make that expansion more
          accessible, useful, and responsible across Africa.
        </p>
      </header>

      <section className={styles.story} aria-labelledby="research-why-heading">
        <h2 id="research-why-heading">Why this work matters</h2>
        <p>
          The systems shaping AI are often developed far from the people who will live and work with
          them. That distance affects what gets built, what gets measured, and who can afford to use
          it.
        </p>
        <p className={styles.pull}>Africa should help define the future AI creates.</p>
        <p>
          Our research will connect technical questions with the realities of access: the languages
          people use, the infrastructure they rely on, and the outcomes that make AI genuinely useful.
        </p>
      </section>

      <section className={styles.areas} aria-labelledby="research-areas-heading">
        <h2 id="research-areas-heading">Areas of inquiry</h2>
        <ul>
          {AREAS.map((area) => (
            <li key={area.title}>
              <h3>{area.title}</h3>
              <p>{area.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.publish} aria-labelledby="research-publish-heading">
        <h2 id="research-publish-heading">A public body of work</h2>
        <p>
          As this work becomes ready to share, we will publish research, benchmarks, and perspectives
          here. Until then, Rovie Route is how we are putting the first part of this mission into
          practice.
        </p>
        <a href={ROUTE_URL}>Explore Rovie Route <span aria-hidden="true">→</span></a>
      </section>
    </main>
  );
}
