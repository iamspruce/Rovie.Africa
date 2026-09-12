import { Link } from 'react-router-dom';
// Loaded here rather than in main.tsx: Borel is used on this page and nowhere
// else, and this route is a lazy chunk, so a visitor who only reads the
// homepage never pays for the file. See $font-family-script for the rule.
import '@fontsource/borel/latin-400.css';
import { CONTACT_EMAIL, DOCS_URL, ROUTE_URL } from '../../content/navLinks';
import styles from './About.module.scss';

// -----------------------------------------------------------------------
// Everything on this page is a claim the rest of the repository can back:
// the pricing mechanics come from docs/guides/billing, the provider list and
// the four "will not" items from docs/start/what-rovie-is, the settlement
// currencies from the payments flow. No founders, no headcount, no funding
// and no dates - the site never states a figure it can't stand behind, and
// that rule does not stop applying because the page is about us.
// -----------------------------------------------------------------------

const BUILT = [
  {
    title: 'One key, not nine',
    body: 'Same request shape, same response shape, same balance, whichever model you name. Moving from GPT to Claude is an edit to one string, not a migration.',
  },
  {
    title: 'Priced where you are',
    body: 'Every rate on the models page is converted from USD at a live rate rather than a stale one, so you are quoted in your own currency before you spend anything.',
  },
  {
    title: 'A balance, not a card',
    body: 'Top up by bank transfer or stablecoin, and calls draw the balance down. At zero they stop. Nothing overdrafts, nothing renews, nothing is charged to a card on file.',
  },
];

export function About() {
  return (
    <main className={`container ${styles.page}`}>
      {/* Centred, like the homepage hero - the alignment changes further down,
          where the page stops making a claim and starts explaining one. */}
      <header className={styles.head}>
        <span className={styles.eyebrow}>About</span>
        <h1 className={styles.display}>Why Rovie exists</h1>
        <p className={styles.thesis}>
          We think the next generation of AI gets built everywhere. Rovie exists so that where you
          are stops deciding what you are able to build with.
        </p>
      </header>

      <section className={styles.story} aria-labelledby="story-heading">
        <h2 id="story-heading" className={styles.sectionHeading}>
          The problem
        </h2>

        <p>
          Every frontier lab prices in dollars and bills a card. Written down like that it sounds
          like a detail of the checkout page. It is not.
        </p>
        <p>
          In Lagos, Kampala, Accra and Nairobi, a naira card is declined outright. A dollar card, if
          you can get one, carries a monthly limit measured in tens of dollars — a rounding error
          against a model you are calling in production. The API is open to everyone and the payment
          rail is not, so the constraint never shows up as a refusal. It shows up as a project that
          quietly stays a prototype.
        </p>

        <p className={styles.pull}>
          A team that can write the code cannot buy the tokens.
        </p>

        <p>
          The technical half of the problem is smaller and better understood. Nine providers mean
          nine accounts, nine keys, nine SDKs, nine billing relationships and nine sets of rate
          limits to reason about. Comparing two models means doing all of that twice, and switching
          between them means a code change.
        </p>
        <p>
          Rovie holds both halves so you do not have to. One account and one API key, one
          OpenAI-compatible endpoint, and behind it OpenAI, Anthropic, Google, Meta, DeepSeek,
          Mistral and the rest. We keep the dollar relationship with the providers; you pay in the
          currency your salary is in.
        </p>
      </section>

      <section className={styles.built} aria-labelledby="built-heading">
        <h2 id="built-heading" className={styles.sectionHeading}>
          What that comes to in practice
        </h2>

        <ul className={styles.builtList}>
          {BUILT.map((item) => (
            <li key={item.title} className={styles.builtItem}>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Gateways differ from one another mostly in what they quietly do to
          your traffic, so this section is specific rather than reassuring. */}
      <section className={styles.limits} aria-labelledby="limits-heading">
        <h2 id="limits-heading" className={styles.sectionHeading}>
          What Rovie will not do
        </h2>

        <dl className={styles.limitList}>
          <div className={styles.limit}>
            <dt>Train on your traffic</dt>
            <dd>
              Prompts and completions pass through the gateway and are not retained by Rovie as
              training data. What each upstream provider does with them is that provider&apos;s own
              policy, which is the question actually worth asking — the{' '}
              <Link to="/data-policy">data policy</Link> says which is which.
            </dd>
          </div>

          <div className={styles.limit}>
            <dt>Silently reroute you</dt>
            <dd>
              A request for Claude that came back answered by GPT would be a worse outcome than a
              failed request. When a provider is down you get a 503 and the decision stays yours;
              the <Link to="/status">status page</Link> runs the same checks your key does.
            </dd>
          </div>

          <div className={styles.limit}>
            <dt>Host the models</dt>
            <dd>
              Rovie proxies to the providers&apos; own APIs. The model you call is the
              provider&apos;s real model at the provider&apos;s real quality, not a quantised copy
              of it running somewhere cheaper.
            </dd>
          </div>

          <div className={styles.limit}>
            <dt>Sell you a subscription</dt>
            <dd>
              There is no seat price, no monthly minimum and no plan to be upgraded out of. A month
              in which you make no calls costs nothing.
            </dd>
          </div>
        </dl>
      </section>

      <section className={styles.money} aria-labelledby="money-heading">
        <h2 id="money-heading" className={styles.sectionHeading}>
          How we make money
        </h2>

        <p>
          On the conversion, and nowhere else. When you top up, Rovie converts your currency into
          the USD balance the providers charge against — at a rate locked when the charge is
          created, minus a markup. That is the whole business model. Your calls are then metered at
          the providers&apos; own per-token rates, which are the rates printed on the{' '}
          <Link to="/models">models page</Link>.
        </p>
      </section>

      <section className={styles.yet} aria-labelledby="yet-heading">
        <h2 id="yet-heading" className={styles.sectionHeading}>
          What we cannot do yet
        </h2>

        <p>
          Rovie can <strong>quote</strong> a price in every African currency its rate feed carries;
          that is what the globe on the homepage and every figure on the models page run on. It can{' '}
          <strong>settle</strong> a payment in a shorter list — naira, Ugandan shillings, cedis and
          Kenyan shillings. Holding funds in a currency is a compliance question rather than a
          technical one, so that list grows slowly and deliberately. Everywhere else, prices are
          shown in dollars and your key behaves identically.
        </p>
        <p>
          Inference only, today: no fine-tuning and no hosted weights. And{' '}
          <Link to="/rankings">what the continent is building with</Link> is published in aggregate
          because it is worth knowing — never per account, and never attributed.
        </p>
      </section>

      {/* The second and last line of script on this site. It closes the page in
          the first person, which is the one moment the mono face cannot do. */}
      <section className={styles.close} aria-labelledby="close-heading">
        <h2 id="close-heading" className={`${styles.display} ${styles.signoff}`}>
          Come and build
        </h2>
        <p className={styles.closeBody}>
          An email address and your country is the whole sign-up. If you would rather ask a person
          something first, mail reaches one — there is no ticket portal and no bot behind that
          address.
        </p>

        <div className={styles.actions}>
          <a className={styles.primaryAction} href={`${ROUTE_URL}/signup`}>
            Create an account
          </a>
          <a className={styles.action} href={`${DOCS_URL}/start/quickstart/`}>
            Read the quickstart
          </a>
          <a className={styles.action} href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>
        </div>
      </section>
    </main>
  );
}
