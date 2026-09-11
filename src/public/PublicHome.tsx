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
  ['construction', 'Construction'],
  ['development', 'Development'],
  ['work', 'Work'],
  ['about', 'About us'],
  ['contact', 'Contact us'],
] as const;

type SectionId = typeof sectionTabs[number][0];

function PortalIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h7v2H6v12h5v2H4V4Zm9.6 4.2L18.4 13H9v2h9.4l-4.8 4.8 1.4 1.4L22.2 14 15 6.8l-1.4 1.4Z"/></svg>;
}

export function PublicHome() {
  const base = import.meta.env.BASE_URL;
  const portalHref = `${base}?portal=1`;
  const [activeSection, setActiveSection] = useState<SectionId | null>(null);

  useEffect(() => {
    document.title = 'Ridgewood — Construction • Development';
    document.body.classList.add('public-site-body');
    const priorRestoration = history.scrollRestoration;
    history.scrollRestoration = 'manual';

    if (window.location.hash) {
      history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    }

    const resetTop = () => window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    resetTop();
    requestAnimationFrame(() => requestAnimationFrame(resetTop));
    const resetTimer = window.setTimeout(resetTop, 120);

    let ticking = false;
    const updateActiveSection = () => {
      ticking = false;
      const header = document.querySelector<HTMLElement>('.public-header');
      const marker = (header?.offsetHeight ?? 130) + 20;
      let current: SectionId | null = null;

      for (const [id] of sectionTabs) {
        const section = document.getElementById(id);
        if (section && section.getBoundingClientRect().top <= marker) current = id;
      }

      if (window.scrollY < 160) current = null;
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
    const section = document.getElementById(id);
    const header = document.querySelector<HTMLElement>('.public-header');
    if (!section) return;

    const headerHeight = header?.offsetHeight ?? 130;
    const targetTop = section.getBoundingClientRect().top + window.scrollY - headerHeight;
    window.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
  }

  return (
    <div className="public-site">
      <header className="public-header">
        <div className="public-header__top public-container">
          <a className="public-brand" href="#top" aria-label="Ridgewood home" onClick={(event) => { event.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
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
        <section className="public-hero" aria-labelledby="hero-title">
          <div className="public-hero__visual" aria-hidden="true"><div className="public-hero__grid"/><div className="public-hero__frame"/><div className="public-hero__mass public-hero__mass--one"/><div className="public-hero__mass public-hero__mass--two"/></div>
          <div className="public-container public-hero__content">
            <h1 id="hero-title">Built to deliver.<br />Positioned to develop.</h1>
            <p className="public-hero__lede">Ridgewood is an owner-led construction and development company bringing practical building experience, disciplined management and the right partners to each opportunity.</p>
            <div className="public-actions"><a className="public-button public-button--primary" href="#work" onClick={(event) => scrollToSection(event, 'work')}>View our work</a><a className="public-button public-button--ghost" href="#contact" onClick={(event) => scrollToSection(event, 'contact')}>Discuss an opportunity</a></div>
            <p className="public-hero__media-note">Visual direction placeholder — not a Ridgewood project image.</p>
          </div>
        </section>

        <section className="public-capability-band" aria-label="Ridgewood capabilities"><div className="public-container public-capability-band__inner">{['Residential Development', 'Custom Construction', 'Renovation', 'Commercial Interiors', 'Project Management'].map((item) => <span key={item}>{item}</span>)}</div></section>

        <section id="construction" className="public-section public-copy-section"><div className="public-container public-copy-grid"><div><p className="public-eyebrow">Construction</p><h2>Experience at the site. Accountability through delivery.</h2></div><p>From ground-up residential work and substantial renovations to commercial interiors and complex completion, Ridgewood coordinates the people, information and execution required to move projects forward.</p></div></section>

        <section id="development" className="public-section public-copy-section public-copy-section--alt"><div className="public-container public-copy-grid"><div><p className="public-eyebrow">Development</p><h2>Construction knowledge applied earlier.</h2></div><p>Ridgewood brings practical delivery experience upstream—evaluating opportunities, structuring project-specific teams and managing the path from concept toward a completed asset.</p></div></section>

        <section id="work" className="public-section public-work"><div className="public-container"><div className="public-section-heading"><div><p className="public-eyebrow">Selected work</p><h2>Experience across building, renovation and development.</h2></div><p>Project names and addresses are withheld from this public concept until publication approval is confirmed. Authentic project media will replace placeholders after archive recovery.</p></div><div className="public-project-strip" role="list" aria-label="Selected project types">{projectTypes.map((type) => <article className="public-project-slide" role="listitem" key={type}><div className="public-project-slide__placeholder" aria-hidden="true"/><div className="public-project-slide__overlay"><span>Selected work</span><h3>{type}</h3></div></article>)}</div></div></section>

        <section className="public-section public-process" aria-labelledby="process-title"><div className="public-container"><p className="public-eyebrow">How Ridgewood works</p><h2 id="process-title">Clarity before construction. Ownership through completion.</h2><div className="public-process__grid">{[['01','Understand','Define the opportunity, constraints, scope and commercial reality before momentum creates avoidable risk.'],['02','Plan','Assemble the right team, coordinate preconstruction, establish priorities and create a practical delivery strategy.'],['03','Deliver','Manage construction, decisions, quality, schedule and closeout with clear ownership and visible next actions.']].map(([n,t,c]) => <article key={n}><span>{n}</span><h3>{t}</h3><p>{c}</p></article>)}</div></div></section>

        <section id="about" className="public-section public-founder"><div className="public-container public-founder__grid"><div className="public-founder__placeholder" aria-hidden="true"/><div className="public-founder__copy"><p className="public-eyebrow">About us</p><h2>Built from the work outward.</h2><p>Ridgewood is led by Edward Nguyễn, whose experience spans hands-on construction, custom residential work, redevelopment, renovation, commercial interiors and project management. The company's next chapter is focused on stronger construction management, development and strategic project partnerships.</p><p className="public-small-note">Founder imagery and final biography language remain subject to publication approval.</p></div></div></section>

        <section id="contact" className="public-opportunity"><div className="public-container public-opportunity__inner"><p className="public-eyebrow">Contact us</p><h2>Have a project, property or opportunity worth discussing?</h2><p>Start with the type of conversation that fits.</p><div className="public-actions"><a className="public-button public-button--light" href="mailto:info@ridgewoodgroup.ca?subject=Construction%20Project%20Inquiry">Construction project</a><a className="public-button public-button--outline-light" href="mailto:info@ridgewoodgroup.ca?subject=Development%20Opportunity">Development opportunity</a></div></div></section>
      </main>

      <footer className="public-footer"><div className="public-container public-footer__grid"><img className="public-footer__brand" src={ridgewoodWordmark} alt="Ridgewood — Construction • Development"/><p>© {new Date().getFullYear()} Ridgewood.</p></div></footer>
    </div>
  );
}
