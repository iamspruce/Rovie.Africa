import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AfricaMapLazy } from '../../components/AfricaMap/AfricaMapLazy';
import type { MapModelTag } from '../../components/AfricaMap/AfricaMapSvg';
import { useFxRates } from '../../hooks/useFxRates';
import { useModels } from '../../hooks/useModels';
import { useVisitorCountry } from '../../hooks/useVisitorCountry';
import { currencyForAlpha2 } from '../../lib/d3/africaCountries';
import { formatLocalOrUsd, modelFamily, quoteModels, selectLatestPerFamily } from '../../lib/pricing';
import type { FxRates } from '../../lib/currency';
import { REFERENCE_USD_AMOUNT } from '../../sdk';
import { SmartLink } from '../../components/SmartLink/SmartLink';
import { ROUTE_URL } from '../../content/navLinks';
import styles from './Home.module.scss';

const DEFAULT_ALPHA2 = 'NG';
const MAX_GLOBE_TAGS = 5;
const FALLBACK_TAG_MODELS = ['GPT-4o', 'Claude Sonnet', 'Gemini Pro', 'Llama 3.1', 'DeepSeek V3'];

function priceTooltip(alpha2: string, fxRates: FxRates | null) {
  const currency = currencyForAlpha2(alpha2);
  const { text, isLocal } = formatLocalOrUsd(REFERENCE_USD_AMOUNT, fxRates, currency);
  return isLocal ? `$${REFERENCE_USD_AMOUNT.toFixed(2)} ≈ ${text}` : `Shown in USD · ${currency ?? ''}`;
}

const PRODUCTS = [
  {
    name: 'Rovie Route',
    status: 'Available now',
    description:
      'One API for the leading models, with routing, local-currency pricing, and payment methods built for Africa.',
    action: 'Explore Rovie Route',
    to: ROUTE_URL,
    external: true,
  },
  {
    name: 'Rovie Code',
    status: 'In development',
    description:
      'A home for AI coding agents, bringing the models, project context, and developer tools they need into one focused workflow.',
    action: 'About Rovie Code',
    to: '/code',
  },
  {
    name: 'Rovie Research',
    status: 'In development',
    description:
      'Research into the systems, access, and applications that help AI serve people across Africa.',
    action: 'Our research',
    to: '/research',
  },
] as const;

const FROM_ROVIE = [
  {
    category: 'Rovie Route',
    title: 'Explore the models available through Route',
    description: 'Current models, capabilities, and live local-currency pricing.',
    to: ROUTE_URL,
    external: true,
  },
  {
    category: 'Company',
    title: 'Why Rovie exists',
    description: 'The access problem we are here to solve, and the principles behind our work.',
    to: '/about',
  },
  {
    category: 'Data',
    title: 'What Africa is building with',
    description: 'A view of the models developers use through Rovie Route.',
    to: '/rankings',
  },
] as const;

export function Home() {
  const { data: fxRates } = useFxRates();
  const { data: modelsData } = useModels();
  const { country: visitorCountry } = useVisitorCountry();
  const [pickedAlpha2, setPickedAlpha2] = useState<string | null>(null);
  const knownAlpha2 = pickedAlpha2 ?? visitorCountry?.alpha2 ?? null;
  const highlightAlpha2 = knownAlpha2 ?? DEFAULT_ALPHA2;
  const selectedCurrency = knownAlpha2 ? currencyForAlpha2(knownAlpha2) : undefined;
  const models = useMemo(() => modelsData?.models ?? [], [modelsData]);
  const latestPerFamily = useMemo(() => selectLatestPerFamily(models), [models]);
  const globeQuotes = useMemo(
    () => quoteModels(latestPerFamily.slice(0, MAX_GLOBE_TAGS), REFERENCE_USD_AMOUNT, fxRates, selectedCurrency),
    [latestPerFamily, fxRates, selectedCurrency]
  );
  const referencePrice = formatLocalOrUsd(REFERENCE_USD_AMOUNT, fxRates, selectedCurrency).text;
  const tags: MapModelTag[] = useMemo(() => {
    if (globeQuotes.length > 0) {
      return globeQuotes.map(({ model, tokensLabel }) => ({
        id: model.litellmModelName,
        name: model.name,
        price: `${tokensLabel} tokens · ${referencePrice}`,
        family: modelFamily(model),
      }));
    }
    return FALLBACK_TAG_MODELS.map((name) => ({
      id: name,
      name,
      price: `From ${referencePrice}`,
      family: modelFamily({ litellmModelName: name, name, provider: '' }),
    }));
  }, [globeQuotes, referencePrice]);

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          {/* The first line establishes the work; the second makes clear whom
              it is for. */}
          <h1>
            AI for
            <br />
            <span className={styles.heroAccent}>Africa.</span>
          </h1>
          <p className={styles.heroSubtitle}>
            AI will have a vast impact on the world. Rovie&apos;s aim is to make AI accessible and
            cheaper for Africans — through research, models, and the infrastructure that brings
            them to people.
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

      <section className={styles.purpose} aria-labelledby="purpose-heading">
        <div className={styles.purposeLead}>
          <span className={styles.sectionEyebrow}>Our purpose</span>
          <h2 id="purpose-heading">Africa should help shape the future of AI.</h2>
        </div>

        <div className={styles.purposeBody}>
          <p>
            AI will change how people learn, create, work, and build businesses. Africa should not
            be last to access it, adapt it, or benefit from it.
          </p>
          <p>
            Rovie builds the research, products, models, and infrastructure that make AI more
            useful, cheaper, and grounded in the lives of people across the continent.
          </p>
          <p className={styles.purposeStatement}>We begin with access. We are building for agency.</p>
        </div>
      </section>

      <section className={styles.products} aria-labelledby="products-heading">
        <div className={styles.sectionHead}>
          <span className={styles.sectionEyebrow}>What we&apos;re building</span>
          <h2 id="products-heading">An AI company for Africa.</h2>
          <p>
            Rovie brings research, models, and infrastructure together so more people can use and
            shape AI.
          </p>
        </div>

        <ul className={styles.productList}>
          {PRODUCTS.map((product) => (
            <li key={product.name} className={styles.product}>
              <span className={styles.productStatus}>{product.status}</span>
              <h3>{product.name}</h3>
              <p>{product.description}</p>
              <SmartLink className={styles.productAction} to={product.to} external={'external' in product}>
                {product.action} <span aria-hidden="true">→</span>
              </SmartLink>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.fromRovie} aria-labelledby="from-rovie-heading">
        <div className={styles.sectionHead}>
          <span className={styles.sectionEyebrow}>Explore Rovie</span>
          <h2 id="from-rovie-heading">The work behind Rovie.</h2>
        </div>

        <ul className={styles.workList}>
          {FROM_ROVIE.map((item) => (
            <li key={item.title} className={styles.workItem}>
              <SmartLink to={item.to} external={'external' in item} className={styles.workLink}>
                <span className={styles.workCategory}>{item.category}</span>
                <span className={styles.workBody}>
                  <span className={styles.workTitle}>{item.title}</span>
                  <span className={styles.workDescription}>{item.description}</span>
                </span>
                <span className={styles.workArrow} aria-hidden="true">→</span>
              </SmartLink>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
