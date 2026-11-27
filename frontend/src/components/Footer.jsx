// All styles for this footer live here, so the component works as a single file.
const css = `
@import url("https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700&family=DM+Sans:wght@400;500&display=swap");

.ylf {
  --neon: #b6f36b;
  --white: #ffffff;
  --black: #111512;
  --dark-green: #123b28;
  --grey: #ffffff;
  --light-grey: #d9dad5;

  background: var(--grey);
  color: var(--black);
  font-family: "DM Sans", system-ui, sans-serif;
  padding: 80px 24px 32px;
  scroll-margin-top: 80px;
}
.ylf *,
.ylf *::before,
.ylf *::after { box-sizing: border-box; }
.ylf h2, .ylf h3, .ylf p, .ylf ul { margin: 0; padding: 0; }
.ylf ul { list-style: none; }
.ylf a { color: inherit; text-decoration: none; }

.ylf-inner { max-width: 1100px; margin: 0 auto; }

/* Top: brand + link columns */
.ylf-top {
  display: grid;
  grid-template-columns: 5fr 2fr 2fr 2fr;
  gap: 48px;
  padding-bottom: 56px;
  border-bottom: 1px solid rgba(17, 21, 18, 0.22);
}

.ylf-brand {
  font-family: "Bricolage Grotesque", sans-serif;
  font-weight: 700;
  font-size: 1.6rem;
  color: var(--black);
  letter-spacing: -0.01em;
}
.ylf-blurb {
  margin-top: 14px;
  max-width: 32ch;
  line-height: 1.6;
  color: var(--dark-green);
}
.ylf-cta {
  display: inline-block;
  margin-top: 26px;
  padding: 12px 22px;
  background: var(--neon);
  color: var(--neon);
  font-weight: 500;
  border-radius: 2px;
  transition: transform 0.2s ease, background 0.2s ease;
}
.ylf-cta:hover { background: var(--neon); color: var(--black); transform: translateY(-2px); }

.ylf-col h3 {
  font-family: "Bricolage Grotesque", sans-serif;
  font-size: 1rem;
  color: var(--black);
  margin-bottom: 18px;
}
.ylf-col li + li { margin-top: 12px; }
.ylf-col a {
  color: var(--dark-green);
  transition: color 0.2s ease;
}
.ylf-col a:hover { color: var(--black); text-decoration: underline; }

/* Bottom bar */
.ylf-bottom {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 20px 32px;
  padding-top: 28px;
  font-size: 0.88rem;
  color: var(--dark-green);
}
.ylf-legal { display: flex; gap: 24px; }
.ylf-legal a:hover { color: var(--black); text-decoration: underline; }

.ylf-social { display: flex; gap: 18px; }
.ylf-social a { display: block; line-height: 0; color: var(--black); transition: color 0.2s ease; }
.ylf-social a:hover { color: var(--white); }
.ylf-social svg { width: 20px; height: 20px; fill: currentColor; }

.ylf a:focus-visible { outline: 3px solid var(--black); outline-offset: 3px; }

@media (max-width: 860px) {
  .ylf { padding: 64px 20px 28px; }
  .ylf-top { grid-template-columns: 1fr 1fr; gap: 40px 24px; }
  .ylf-about { grid-column: 1 / 3; }
}
@media (max-width: 480px) {
  .ylf-bottom { flex-direction: column; align-items: flex-start; }
}
`;

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "How it works", href: "#how-it-works" },
      { label: "Pricing", href: "#pricing" },
      { label: "Request a demo", href: "#demo" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#about" },
      { label: "Contact", href: "#contact" },
      { label: "Careers", href: "#careers" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Help centre", href: "#help" },
      { label: "Guides", href: "#guides" },
      { label: "FAQ", href: "#faq" },
    ],
  },
];

const SOCIALS = [
  {
    label: "X",
    href: "#",
    path: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  },
  {
    label: "YouTube",
    href: "#",
    path: "M21.6 7.2a2.5 2.5 0 0 0-1.76-1.77C18.3 5 12 5 12 5s-6.3 0-7.84.43A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.76 1.77C5.7 19 12 19 12 19s6.3 0 7.84-.43a2.5 2.5 0 0 0 1.76-1.77A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8zM10 15V9l5.2 3z",
  },
  {
    label: "Instagram",
    href: "#",
    path: "M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3zm5 3.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9zm0 2a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zm5.2-3.2a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2z",
  },
  {
    label: "LinkedIn",
    href: "#",
    path: "M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm3.1 6.5v8h2.6v-8zM8.4 5.7a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm3.3 3.8v8h2.5v-4.2c0-1.1.6-1.8 1.5-1.8s1.3.7 1.3 1.8v4.2h2.5v-4.7c0-2.2-1.2-3.4-2.9-3.4-1.1 0-1.8.5-2.2 1.1v-1z",
  },
];

export default function YardlineFooter() {
  return (
    <footer id="contact" className="ylf">
      <style>{css}</style>

      <div className="ylf-inner">
        <div className="ylf-top">
          <div className="ylf-about">
            <div className="ylf-brand">Parcel Point</div>
            <p className="ylf-blurb">
              Inventory and warehouse management that shows you exactly what is
              on every shelf.
            </p>
            <a className="ylf-cta" href="#demo">
              Request a demo
            </a>
          </div>

          {COLUMNS.map((col) => (
            <nav className="ylf-col" key={col.title} aria-label={col.title}>
              <h3>{col.title}</h3>
              <ul>
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a href={l.href}>{l.label}</a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="ylf-bottom">
          <p>© {new Date().getFullYear()} Parcel Point. All rights reserved.</p>

          <div className="ylf-legal">
            <a href="#privacy">Privacy</a>
            <a href="#terms">Terms</a>
          </div>

          <div className="ylf-social">
            {SOCIALS.map((s) => (
              <a key={s.label} href={s.href} aria-label={s.label}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d={s.path} />
                </svg>
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
