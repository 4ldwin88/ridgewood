import { useEffect, useState } from 'react';
import type { MouseEvent } from 'react';
import ridgewoodWordmark from '../../assets/ridgewood-wordmark-primary-light.png';
import './public.css';
import './public-overrides.css';

const projectTypes = [
  'Residential Development',
  'Commercial Interiors',
  'Custom Residential',
  'Renovation & Completion',
];

const sectionTabs = [
  ['home', 'Home'],
  ['build', 'Build'],
  ['develop', 'Develop'],
  ['vision', 'Vision'],
  ['work', 'Work'],
  ['about', 'About'],
  ['contact', 'Contact'],
] as const;

type SectionId = typeof sectionTabs[number][0];

const buildCapabilities = [
  'Custom residential',
  'Major renovations & completion',
  'Commercial interiors',
  'Construction & project management',
  'Preconstruction coordination',
];

const developCapabilities = [
  'Opportunity evaluation',
  'Feasibility & predevelopment',
  'Project structuring',
  'Partner & consultant coordination',
  'Construction-informed decision making',
  'Delivery management',
];

function PortalIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h7v2H6v12h5v2H4V4Zm9.6 4.2L18.4 13H9v2h9.4l-4.8 4.8 1.4 1.4L22.2 14 15 6.8l-1.4 1.4Z"/></svg>;
}

export function PublicHome() {
  const base = import.meta.env.BASE_URL;
  const portalHref = `${base}?portal=1`;
  const [activeSection, setActiveSection] = useState<SectionId>('home');

  useEffect(() => {
    document.title = 'Ridgewood — Construction • Development';
    document.body.classList.add('public-site-body');
    const priorRestoration = history.scrollRestoration;
    history.scrollRestoration = 'manual';

    if (window.location.hash) history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);

    const resetTop = () => window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    resetTop();
    requestAnimationFrame(() => requestAnimationFrame(resetTop));
    const resetTimer = window.setTimeout(resetTop, 120);

    let ticking = false;
    const updateActiveSection = () => {
      ticking = false;
      const header = document.querySelector<HTMLElement>('.public-header');
      const marker = (header?.offsetHeight ?? 130) + 24;
      let current: SectionId = 'home';

      for (const [id] of sectionTabs.slice(1)) {
        const section = document.getElementById(id);
        if (section && section.getBoundingClientRect().top <= marker) current = id;
      }
      setActiveSection(current);
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(updateActiveSection);
    };

    updateActiveSection();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    return () => {
      window.clearTimeout(resetTimer);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      history.scrollRestoration = priorRestoration;
      document.body.classList.remove('public-site-body');
    };
  }, []);

  function scrollToSection(event: MouseEvent<HTMLAnchorElement>, id: SectionId) {
    event.preventDefault();
    const header = document.querySelector<HTMLElement>('.public-header');
    const headerHeight = header?.offsetHeight ?? 130;

    if (id === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const section = document.getElementById(id);
    if (!section) return;
    const targetTop = section.getBoundingClientRect().top + window.scrollY - headerHeight;
    window.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
  }

  return (
    <div className="public-site">
      <header className="public-header">
        <div className="public-header__top public-container">
          <a className="public-brand" href="#home" aria-label="Ridgewood home" onClick={(event) => scrollToSection(event, 'home')}>
            <img src={ridgewoodWordmark} alt="Ridgewood — Construction • Development" />
          </a>
          <a className="public-portal-icon" href={portalHref} aria-label="Open Ridgewood OS Portal"><PortalIcon /></a>
        </div>
        <nav className="public-tabs" aria-label="Page sections">
          <div className="public-container public-tabs__inner">
            {sectionTabs.map(([id, label]) => <a key={id} href={`#${id}`} className={activeSection === id ? 'is-active' : ''} aria-current={activeSection === id ? 'location' : undefined} onClick={(event) => scrollToSection(event, id)}>{label}</a>)}
          </div>
        </nav>
      </header>

      <main id="top">
        <section id="home" className="public-hero" aria-labelledby="hero-title">
          <div className="public-hero__visual" aria-hidden="true"><div className="public-hero__grid"/><div className="public-hero__frame"/><div className="public-hero__mass public-hero__mass--one"/><div className="public-hero__mass public-hero__mass--two"/></div>
          <div className="public-container public-hero__content">
            <p className="public-hero__kicker">Builder knowledge. Developer thinking.</p>
            <h1 id="hero-title">Built to deliver.<br />Positioned to develop.</h1>
            <p className="public-hero__lede">Construction experience changes the way we develop. Ridgewood brings real building knowledge into every project—from first feasibility to final delivery.</p>
            <div className="public-actions"><a className="public-button public-button--primary" href="#build" onClick={(event) => scrollToSection(event, 'build')}>Explore Ridgewood</a><a className="public-button public-button--ghost" href="#contact" onClick={(event) => scrollToSection(event, 'contact')}>Discuss an opportunity</a></div>
            <p className="public-hero__media-note">Visual direction placeholder — not a Ridgewood project image.</p>
          </div>
        </section>

        <section className="public-thesis" aria-label="Why Ridgewood">
          <div className="public-container">
            <p className="public-eyebrow">Why Ridgewood</p>
            <div className="public-thesis__grid">
              <article><span>01</span><h2>Builder's perspective</h2><p>Decisions are informed by real construction experience, not theory alone.</p></article>
              <article><span>02</span><h2>Owner-level accountability</h2><p>Projects are led with direct responsibility and clear ownership through delivery.</p></article>
              <article><span>03</span><h2>Built for opportunity</h2><p>Ridgewood can step in as builder, manager, development partner or project lead depending on the opportunity.</p></article>
            </div>
          </div>
        </section>

        <section id="build" className="public-section public-capability-story">
          <div className="public-container public-capability-story__grid">
            <div><p className="public-eyebrow">Build</p><h2>From first scope to final handoff.</h2><p className="public-capability-story__lead">Ridgewood coordinates trades, design information, budgets, schedule, site decisions and completion with one goal: move the work forward with fewer surprises and clearer ownership.</p></div>
            <div className="public-capability-list">{buildCapabilities.map((item, index) => <div key={item}><span>{String(index + 1).padStart(2, '0')}</span><strong>{item}</strong></div>)}</div>
          </div>
        </section>

        <section id="develop" className="public-section public-capability-story public-capability-story--alt">
          <div className="public-container public-capability-story__grid">
            <div><p className="public-eyebrow">Develop</p><h2>Finding value before construction begins.</h2><p className="public-capability-story__lead">Ridgewood brings construction knowledge upstream—testing opportunities, shaping the project team and making earlier decisions with delivery reality in view.</p></div>
            <div className="public-capability-list">{developCapabilities.map((item, index) => <div key={item}><span>{String(index + 1).padStart(2, '0')}</span><strong>{item}</strong></div>)}</div>
          </div>
        </section>

        <section id="vision" className="public-section public-vision">
          <div className="public-container public-vision__grid">
            <div><p className="public-eyebrow">Vision</p><h2>Building more than projects.</h2></div>
            <div><p>Ridgewood is growing from a construction-led business into a stronger construction management and development platform—one built around practical execution, aligned partners and opportunities that can create lasting value.</p><p>That means moving upstream when it adds value, staying close to delivery, and building the capability to lead projects from opportunity through completion without losing the builder's perspective.</p></div>
          </div>
        </section>

        <section id="work" className="public-section public-work"><div className="public-container"><div className="public-section-heading"><div><p className="public-eyebrow">Selected work</p><h2>Experience across building, renovation and development.</h2></div><p>Project names and addresses are withheld from this public concept until publication approval is confirmed. Authentic project media will replace placeholders after archive recovery.</p></div><div className="public-project-strip" role="list" aria-label="Selected project types">{projectTypes.map((type) => <article className="public-project-slide" role="listitem" key={type}><div className="public-project-slide__placeholder" aria-hidden="true"/><div className="public-project-slide__overlay"><span>Selected work</span><h3>{type}</h3></div></article>)}</div></div></section>

        <section className="public-section public-process" aria-labelledby="process-title"><div className="public-container"><p className="public-eyebrow">How Ridgewood works</p><h2 id="process-title">Clarity before construction. Ownership through completion.</h2><div className="public-process__grid">{[['01','Understand','Define the opportunity, constraints, scope and commercial reality before momentum creates avoidable risk.'],['02','Plan','Assemble the right team, coordinate preconstruction, establish priorities and create a practical delivery strategy.'],['03','Deliver','Manage construction, decisions, quality, schedule and closeout with clear ownership and visible next actions.']].map(([n,t,c]) => <article key={n}><span>{n}</span><h3>{t}</h3><p>{c}</p></article>)}</div></div></section>

        <section id="about" className="public-section public-founder"><div className="public-container public-founder__grid"><div className="public-founder__placeholder" aria-hidden="true"/><div className="public-founder__copy"><p className="public-eyebrow">About</p><h2>Built from the work outward.</h2><p>Ridgewood is led by Edward Nguyễn, whose experience spans hands-on construction, custom residential work, redevelopment, renovation, commercial interiors and project management. The company's next chapter is focused on stronger construction management, development and strategic project partnerships.</p><p className="public-small-note">Founder imagery and final biography language remain subject to publication approval.</p></div></div></section>

        <section id="contact" className="public-opportunity"><div className="public-container public-opportunity__inner"><p className="public-eyebrow">Contact</p><h2>Have a project, property or opportunity worth discussing?</h2><p>Start with the type of conversation that fits.</p><div className="public-actions"><a className="public-button public-button--light" href="mailto:info@ridgewoodgroup.ca?subject=Construction%20Project%20Inquiry">Construction project</a><a className="public-button public-button--outline-light" href="mailto:info@ridgewoodgroup.ca?subject=Development%20Opportunity">Development opportunity</a></div></div></section>
      </main>

      <footer className="public-footer"><div className="public-container public-footer__grid"><img className="public-footer__brand" src={ridgewoodWordmark} alt="Ridgewood — Construction • Development"/><p>© {new Date().getFullYear()} Ridgewood.</p></div></footer>
    </div>
  );
}
