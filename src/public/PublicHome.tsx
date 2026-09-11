import { useEffect, useState } from 'react';
import './public.css';

type MediaTone = 'residential' | 'development' | 'commercial' | 'construction';

const projects = [
  { name: 'Bogert', category: 'Residential Development', note: 'Two-home residential development', tone: 'residential' as const },
  { name: 'Goulding', category: 'Development Completion', note: 'Two-home development takeover and completion', tone: 'development' as const },
  { name: 'ARC Studio', category: 'Commercial Interiors', note: 'Completed hair-studio renovation', tone: 'commercial' as const },
  { name: 'Barton', category: 'Custom Residential', note: 'Ground-up custom-home project — final scope validation pending', tone: 'construction' as const },
];

function PlaceholderMedia({ tone, label }: { tone: MediaTone; label: string }) {
  return (
    <div className={`public-media public-media--${tone}`} role="img" aria-label={`${label}. Editorial placeholder, not a Ridgewood project photograph.`}>
      <span>Editorial placeholder</span>
      <small>Authentic project media pending archive recovery</small>
    </div>
  );
}

export function PublicHome() {
  const [menuOpen, setMenuOpen] = useState(false);
  const base = import.meta.env.BASE_URL;
  const portalHref = `${base}?portal=1`;

  useEffect(() => {
    document.title = 'Ridgewood — Construction • Development';
    document.body.classList.add('public-site-body');
    return () => document.body.classList.remove('public-site-body');
  }, []);

  return (
    <div className="public-site">
      <header className="public-header">
        <a className="public-brand" href="#top" aria-label="Ridgewood home">
          <img src={`${base}assets/ridgewood-horizontal-light.svg`} alt="Ridgewood — Construction and Development" />
        </a>
        <button
          className="public-menu-button"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="public-nav"
          onClick={() => setMenuOpen((value) => !value)}
        >
          <span />
          <span />
          <span />
          <span className="sr-only">Menu</span>
        </button>
        <nav id="public-nav" className={`public-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Public navigation">
          <a href="#construction" onClick={() => setMenuOpen(false)}>Construction</a>
          <a href="#development" onClick={() => setMenuOpen(false)}>Development</a>
          <a href="#work" onClick={() => setMenuOpen(false)}>Work</a>
          <a href="#about" onClick={() => setMenuOpen(false)}>About</a>
          <a href="#contact" onClick={() => setMenuOpen(false)}>Contact</a>
          <a className="public-nav__portal" href={portalHref}>Portal</a>
        </nav>
      </header>

      <main id="top">
        <section className="public-hero" aria-labelledby="hero-title">
          <div className="public-hero__visual" aria-hidden="true">
            <div className="public-hero__grid" />
            <div className="public-hero__frame" />
            <div className="public-hero__mass public-hero__mass--one" />
            <div className="public-hero__mass public-hero__mass--two" />
          </div>
          <div className="public-container public-hero__content">
            <p className="public-eyebrow">Construction • Development</p>
            <h1 id="hero-title">Built to deliver.<br />Positioned to develop.</h1>
            <p className="public-hero__lede">
              Ridgewood is an owner-led construction and development company bringing practical building experience,
              disciplined management and the right partners to each opportunity.
            </p>
            <div className="public-actions">
              <a className="public-button public-button--primary" href="#work">View our work</a>
              <a className="public-button public-button--ghost" href="#contact">Discuss an opportunity</a>
            </div>
            <p className="public-hero__media-note">Visual direction placeholder — not a Ridgewood project image.</p>
          </div>
        </section>

        <section className="public-capability-band" aria-label="Ridgewood capabilities">
          <div className="public-container public-capability-band__inner">
            {['Residential Development', 'Custom Construction', 'Renovation', 'Commercial Interiors', 'Project Management'].map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </section>

        <section className="public-section public-split" aria-label="Construction and development">
          <article id="construction" className="public-split__item">
            <PlaceholderMedia tone="construction" label="Construction capability" />
            <div className="public-split__copy">
              <p className="public-eyebrow">Construction</p>
              <h2>Experience at the site. Accountability through delivery.</h2>
              <p>
                From ground-up residential work and substantial renovations to commercial interiors and complex completion,
                Ridgewood coordinates the people, information and execution required to move projects forward.
              </p>
              <a className="public-text-link" href="#contact">Start a construction conversation <span aria-hidden="true">→</span></a>
            </div>
          </article>

          <article id="development" className="public-split__item public-split__item--reverse">
            <PlaceholderMedia tone="development" label="Development capability" />
            <div className="public-split__copy">
              <p className="public-eyebrow">Development</p>
              <h2>Construction knowledge applied earlier.</h2>
              <p>
                Ridgewood brings practical delivery experience upstream—evaluating opportunities, structuring project-specific
                teams and managing the path from concept toward a completed asset.
              </p>
              <a className="public-text-link" href="#contact">Discuss a property or opportunity <span aria-hidden="true">→</span></a>
            </div>
          </article>
        </section>

        <section id="work" className="public-section public-work">
          <div className="public-container">
            <div className="public-section-heading">
              <div>
                <p className="public-eyebrow">Selected work</p>
                <h2>Experience across building, renovation and development.</h2>
              </div>
              <p>
                Historical project imagery is being recovered from Ridgewood archives. Until then, project descriptions remain
                evidence-led and editorial placeholders are explicitly labeled.
              </p>
            </div>
            <div className="public-project-grid">
              {projects.map((project, index) => (
                <article className={`public-project ${index === 0 ? 'public-project--feature' : ''}`} key={project.name}>
                  <PlaceholderMedia tone={project.tone} label={project.name} />
                  <div className="public-project__meta">
                    <p>{project.category}</p>
                    <h3>{project.name}</h3>
                    <span>{project.note}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="public-section public-process" aria-labelledby="process-title">
          <div className="public-container">
            <p className="public-eyebrow">How Ridgewood works</p>
            <h2 id="process-title">Clarity before construction. Ownership through completion.</h2>
            <div className="public-process__grid">
              {[
                ['01', 'Understand', 'Define the opportunity, constraints, scope and commercial reality before momentum creates avoidable risk.'],
                ['02', 'Plan', 'Assemble the right team, coordinate preconstruction, establish priorities and create a practical delivery strategy.'],
                ['03', 'Deliver', 'Manage construction, decisions, quality, schedule and closeout with clear ownership and visible next actions.'],
              ].map(([number, title, copy]) => (
                <article key={number}>
                  <span>{number}</span>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="about" className="public-section public-founder">
          <div className="public-container public-founder__grid">
            <PlaceholderMedia tone="construction" label="Edward Nguyễn founder portrait or site image" />
            <div className="public-founder__copy">
              <p className="public-eyebrow">Owner-led</p>
              <h2>Built from the work outward.</h2>
              <p>
                Ridgewood is led by Edward Nguyễn, whose experience spans hands-on construction, custom residential work,
                redevelopment, renovation, commercial interiors and project management. The company's next chapter is focused on
                stronger construction management, development and strategic project partnerships.
              </p>
              <p className="public-small-note">Founder imagery and final biography language remain subject to Edward's publication approval.</p>
            </div>
          </div>
        </section>

        <section id="contact" className="public-opportunity">
          <div className="public-container public-opportunity__inner">
            <p className="public-eyebrow">Let's build what's next</p>
            <h2>Have a project, property or opportunity worth discussing?</h2>
            <p>Start with the type of conversation that fits.</p>
            <div className="public-actions">
              <a className="public-button public-button--light" href="mailto:info@ridgewoodgroup.ca?subject=Construction%20Project%20Inquiry">Construction project</a>
              <a className="public-button public-button--outline-light" href="mailto:info@ridgewoodgroup.ca?subject=Development%20Opportunity">Development opportunity</a>
            </div>
          </div>
        </section>
      </main>

      <footer className="public-footer">
        <div className="public-container public-footer__grid">
          <a className="public-footer__brand" href="#top">
            <img src={`${base}assets/ridgewood-horizontal-dark.svg`} alt="Ridgewood — Construction and Development" />
          </a>
          <nav aria-label="Footer navigation">
            <a href="#construction">Construction</a>
            <a href="#development">Development</a>
            <a href="#work">Work</a>
            <a href="#about">About</a>
            <a href="#contact">Contact</a>
            <a href={portalHref}>Portal</a>
          </nav>
          <p>© {new Date().getFullYear()} Ridgewood. Public website concept v1.</p>
        </div>
      </footer>
    </div>
  );
}
