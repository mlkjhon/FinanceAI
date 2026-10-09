import { Suspense, lazy } from 'react';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { MotionProvider } from '../components/motion/motion-provider';
import { ReadingProgress } from '../components/motion/reading-progress';
import { LandingHeader } from '../components/landing/landing-header';
import { Hero } from '../components/landing/hero';
import { IndexMarquee } from '../components/landing/index-marquee';
import { Manifesto } from '../components/landing/manifesto';
import { FeatureBento } from '../components/landing/feature-bento';
import { HowItWorks } from '../components/landing/how-it-works';
import { OpenFinance } from '../components/landing/open-finance';
import { ModulesGallery } from '../components/landing/modules-gallery';
import { Testimonials } from '../components/landing/testimonials';
import { Faq } from '../components/landing/faq';
import { FinalCta } from '../components/landing/final-cta';
import { SiteFooter } from '../components/landing/site-footer';
import { getToken } from '../lib/api';

// Abaixo da dobra e com Base UI (tooltip): sai do bundle crítico.
const Simulator = lazy(() => import('../components/landing/simulator').then((m) => ({ default: m.Simulator })));

export const Route = createFileRoute('/')({
  // Logado (com ou sem "manter conectado") não vê a landing: vai direto para o app
  beforeLoad: () => {
    if (getToken()) throw redirect({ to: '/dashboard', replace: true });
  },
  component: LandingPage,
});

function LandingPage() {
  return (
    <MotionProvider>
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[var(--z-overlay)] focus:rounded-full focus:bg-[var(--color-ink)] focus:px-4 focus:py-2 focus:text-white"
      >
        Pular para o conteúdo
      </a>
      <ReadingProgress />
      <LandingHeader />
      <main id="conteudo" className="relative z-[var(--z-main)] bg-[var(--color-bg)]">
        <Hero />
        <IndexMarquee />
        <Manifesto />
        <FeatureBento />
        <HowItWorks />
        <OpenFinance />
        <ModulesGallery />
        <Suspense fallback={<section id="simulador" aria-busy="true" className="scroll-mt-24 min-h-[720px] lg:min-h-[640px]" />}>
          <Simulator />
        </Suspense>
        <Testimonials />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
    </MotionProvider>
  );
}
