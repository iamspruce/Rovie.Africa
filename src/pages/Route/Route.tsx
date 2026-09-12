import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FeaturedModels } from '../../components/FeaturedModels/FeaturedModels';
import { GetStartedSteps } from '../../components/GetStartedSteps/GetStartedSteps';
import { useFxRates } from '../../hooks/useFxRates';
import { useModels } from '../../hooks/useModels';
import { useVisitorCountry } from '../../hooks/useVisitorCountry';
import { currencyForAlpha2 } from '../../lib/d3/africaCountries';
import { formatLocalOrUsd, quoteModels, selectLatestPerFamily } from '../../lib/pricing';
import { REFERENCE_USD_AMOUNT } from '../../sdk';
import styles from './Route.module.scss';

const MAX_FEATURED_MODELS = 4;

const FEATURES = [
  {
    title: 'One API, leading models',
    body: 'Call the models you need through one OpenAI-compatible endpoint. Change the model, not your entire stack.',
  },
  {
    title: 'Priced for where you are',
    body: 'See model prices in your currency before you spend, with live conversion from the underlying USD rate.',
  },
  {
    title: 'Built for agent workflows',
    body: 'Use Route from the tools you already know today, with Rovie Code extending that experience over time.',
  },
];

export function RouteProduct() {
  const { data: fxRates } = useFxRates();
  const { data: modelsData, error: modelsError, isLoading: modelsLoading } = useModels();
  const { country: visitorCountry } = useVisitorCountry();
  const models = useMemo(() => modelsData?.models ?? [], [modelsData]);
  const latestPerFamily = useMemo(() => selectLatestPerFamily(models), [models]);
  const currency = visitorCountry ? currencyForAlpha2(visitorCountry.alpha2) : undefined;
  const referencePrice = formatLocalOrUsd(REFERENCE_USD_AMOUNT, fxRates, currency).text;
  const featuredQuotes = useMemo(
    () => quoteModels(latestPerFamily.slice(0, MAX_FEATURED_MODELS), REFERENCE_USD_AMOUNT, fxRates, currency),
    [latestPerFamily, fxRates, currency]
  );

  return (
    <main>
      <header className={styles.hero}>
        <span className={styles.eyebrow}>A Rovie product</span>
        <h1>Rovie Route</h1>
        <p>
          The infrastructure that gives African builders one reliable way to reach leading AI models.
        </p>
        <div className={styles.actions}>
          <Link className={styles.primaryAction} to="/signup">
            Build with Route
          </Link>
          <Link className={styles.secondaryAction} to="/models">
            Browse models and pricing
          </Link>
        </div>
      </header>

      <section className={styles.features} aria-labelledby="route-features-heading">
        <h2 id="route-features-heading">What Route does</h2>
        <ul>
          {FEATURES.map((feature) => (
            <li key={feature.title}>
              <h3>{feature.title}</h3>
              <p>{feature.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <FeaturedModels
        quotes={featuredQuotes}
        referencePriceText={referencePrice}
        isLoading={modelsLoading}
        error={modelsError}
      />

      <GetStartedSteps />

    </main>
  );
}
