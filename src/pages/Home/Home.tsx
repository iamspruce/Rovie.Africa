import { useMemo, useState } from 'react';
import { AfricaMapLazy } from '../../components/AfricaMap/AfricaMapLazy';
import type { MapModelTag } from '../../components/AfricaMap/AfricaMapSvg';
import { FeaturedModels } from '../../components/FeaturedModels/FeaturedModels';
import { GetStartedSteps } from '../../components/GetStartedSteps/GetStartedSteps';
import { HeroTestimonials } from '../../components/HeroTestimonials/HeroTestimonials';
import { useFxRates } from '../../hooks/useFxRates';
import { useModels } from '../../hooks/useModels';
import { useVisitorCountry } from '../../hooks/useVisitorCountry';
import { currencyForAlpha2 } from '../../lib/d3/africaCountries';
import {
  formatLocalOrUsd,
  modelFamily,
  quoteModels,
  selectLatestPerFamily,
} from '../../lib/pricing';
import type { FxRates } from '../../lib/currency';
import { REFERENCE_USD_AMOUNT } from '../../sdk';
import styles from './Home.module.scss';

const DEFAULT_ALPHA2 = 'NG';

// Matches the number of tag slots positioned around the globe.
const MAX_GLOBE_TAGS = 5;
// The homepage shows a taste of the catalog, not the catalog. Nine rows read
// as a table; four read as a shortlist, and /models carries the rest.
const MAX_FEATURED_MODELS = 4;

// Shown on the globe until the live catalog answers - names only, never
// invented prices.
const FALLBACK_TAG_MODELS = ['GPT-4o', 'Claude Sonnet', 'Gemini Pro', 'Llama 3.1', 'DeepSeek V3'];

function priceTooltip(alpha2: string, fxRates: FxRates | null) {
  const currency = currencyForAlpha2(alpha2);
  const { text, isLocal } = formatLocalOrUsd(REFERENCE_USD_AMOUNT, fxRates, currency);
  return isLocal ? `$${REFERENCE_USD_AMOUNT.toFixed(2)} ≈ ${text}` : `Shown in USD · ${currency ?? ''}`;
}

export function Home() {
  const { data: fxRates } = useFxRates();
  const { data: modelsData, error: modelsError, isLoading: modelsLoading } = useModels();
  const { country: visitorCountry } = useVisitorCountry();
  const [pickedAlpha2, setPickedAlpha2] = useState<string | null>(null);

  // What the visitor picked, or where we detected them. Null means we genuinely
  // don't know - which is different from being in Nigeria.
  const knownAlpha2 = pickedAlpha2 ?? visitorCountry?.alpha2 ?? null;
  // The globe always needs somewhere to plant its marker and run its routes
  // from, so it keeps a default.
  const highlightAlpha2 = knownAlpha2 ?? DEFAULT_ALPHA2;
  // Prices don't get to invent a location. With no country resolved there's no
  // local currency, and formatLocalOrUsd falls back to dollars.
  const selectedCurrency = knownAlpha2 ? currencyForAlpha2(knownAlpha2) : undefined;
  const models = useMemo(() => modelsData?.models ?? [], [modelsData]);

  const referencePrice = formatLocalOrUsd(REFERENCE_USD_AMOUNT, fxRates, selectedCurrency);

  // The newest model each family has shipped, most recent first. The globe and
  // the featured list run off this same set, so the tags you spin past are the
  // rows you then read.
  const latestPerFamily = useMemo(() => selectLatestPerFamily(models), [models]);

  // The featured list below the globe reads as a shortlist, so it stops at
  // four rows and /models carries the rest.
  const featuredQuotes = useMemo(
    () =>
      quoteModels(
        latestPerFamily.slice(0, MAX_FEATURED_MODELS),
        REFERENCE_USD_AMOUNT,
        fxRates,
        selectedCurrency
      ),
    [latestPerFamily, fxRates, selectedCurrency]
  );

  // The globe has five places to hang a tag, so it gets its own slice - it
  // doesn't share the featured list's four-row cap, or the fifth slot would
  // sit empty once the live catalog answers.
  const globeQuotes = useMemo(
    () =>
      quoteModels(
        latestPerFamily.slice(0, MAX_GLOBE_TAGS),
        REFERENCE_USD_AMOUNT,
        fxRates,
        selectedCurrency
      ),
    [latestPerFamily, fxRates, selectedCurrency]
  );

  const tags: MapModelTag[] = useMemo(() => {
    if (globeQuotes.length > 0) {
      return globeQuotes.map(({ model, tokensLabel }) => ({
        id: model.litellmModelName,
        name: model.name,
        price: `${tokensLabel} tokens · ${referencePrice.text}`,
        family: modelFamily(model),
      }));
    }
    return FALLBACK_TAG_MODELS.map((name) => ({
      id: name,
      name,
      price: `From ${referencePrice.text}`,
      family: modelFamily({ litellmModelName: name, name, provider: '' }),
    }));
  }, [globeQuotes, referencePrice.text]);

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <HeroTestimonials />

        <div className={styles.heroContent}>
          {/* "Layer" is the load-bearing word: a tool has features, a layer has
              things built on top of it. The accent lands on the second line
              because "an AI layer" is a category and "for Africa" is the claim. */}
          <h1>
            The AI layer
            <br />
            <span className={styles.heroAccent}>for Africa.</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Rovie is the infrastructure between African builders and the world&apos;s frontier
            models — one account, every leading model, priced for where you are.
          </p>
        </div>

        <div className={styles.mapStage}>
          <AfricaMapLazy
            highlightAlpha2={highlightAlpha2}
            onSelectCountry={setPickedAlpha2}
            priceFor={(alpha2) => priceTooltip(alpha2, fxRates)}
            tags={tags}
            className={styles.heroMap}
          />
        </div>
      </section>

      {/* The rail down the left of this argument is solid where access holds
          and dashed where it breaks - the same 3/4 dash the globe uses for a
          model it can't yet reach. */}
      <section className={styles.mission} aria-labelledby="mission-heading">
        <h2 className={styles.missionThesis} id="mission-heading">
          AI should be accessible, no matter where you build.
        </h2>

        <div className={styles.missionArgument}>
          <p className={styles.missionBelief}>
            We believe the next generation of AI innovation will come from builders everywhere — not
            just a few regions.
          </p>
          <p className={styles.missionFriction}>
            But today, many developers across Africa still face high costs, fragmented APIs, and
            infrastructure that isn&apos;t built for them.
          </p>
          <p className={styles.missionTurn}>We&apos;re changing that.</p>
          <p className={styles.missionPledge}>
            <span className={styles.missionLabel}>Our mission</span>
            <span className={styles.missionStatement}>
              Make AI accessible and affordable{' '}
              <span className={styles.missionHere}>across Africa</span>.
            </span>
          </p>
        </div>
      </section>

      <FeaturedModels
        quotes={featuredQuotes}
        referencePriceText={referencePrice.text}
        isLoading={modelsLoading}
        error={modelsError}
      />

      <GetStartedSteps />
    </main>
  );
}
