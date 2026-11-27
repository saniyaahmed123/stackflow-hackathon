import React from "react";

const css = `
@import url("https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700&family=DM+Sans:wght@400;500;600;700&display=swap");

.yl-section {
  --neon: #b6f36b;
  --white: #ffffff;
  --black: #111512;
  --dark-green: #123b28;
  --grey: #a5aaa5;
  --light-grey: #d9dad5;
  --card-bg: #171b18;

  --gap: 10px;
  --radius: 8px;

  width: 100%;
  max-width: 1350px;
  margin: 0 auto;
  padding: 60px 24px;
  font-family: "DM Sans", system-ui, sans-serif;
  color: var(--white);
  box-sizing: border-box;
}

.yl-section *,
.yl-section *::before,
.yl-section *::after {
  box-sizing: border-box;
}

.yl-section h2,
.yl-section p {
  margin: 0;
}

/* Bento grid */

.yl-bento {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(20, 1fr);
  gap: var(--gap);
  height: 480px;
}

.yl-card {
  border-radius: none;
  overflow: hidden;
  position: relative;
  min-width: 0;
  min-height: 0;
}

/* Card placement */

.yl-intro {
  grid-column: 1 / 3;
  grid-row: 1 / 11;
}

.yl-tall {
  grid-column: 3;
  grid-row: 1 / 14;
}

.yl-clients {
  grid-column: 4;
  grid-row: 1 / 21;
}

.yl-photo {
  grid-column: 1;
  grid-row: 11 / 21;
}

.yl-social {
  grid-column: 2;
  grid-row: 11 / 21;
}

.yl-small {
  grid-column: 3;
  grid-row: 14 / 21;
}

/* Image placeholders */

.yl-slot {
  background: var(--light-grey);
}

.yl-slot img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* Intro card */

.yl-intro {
  background: var(--black);
  padding: 28px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.yl-intro h2 {
  font-family: "Bricolage Grotesque", sans-serif;
  font-size: clamp(1.5rem, 2.6vw, 2.1rem);
  line-height: 1.12;
  letter-spacing: -0.03em;
  max-width: 14em;
  color: var(--white);
}

.yl-btn {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  margin-top: 18px;
  padding: 9px 17px;
  background: var(--neon);
  color: var(--black);
  font-weight: 700;
  font-size: 0.8rem;
  text-decoration: none;
  border-radius: 30px;
  transition: background 0.25s ease, transform 0.25s ease;
}

.yl-btn:hover {
  background: var(--white);
  transform: translateY(-2px);
}

.yl-btn:focus-visible,
.yl-social a:focus-visible {
  outline: 3px solid var(--neon);
  outline-offset: 3px;
}

.yl-note {
  align-self: flex-end;
  max-width: 26ch;
  font-size: 0.75rem;
  line-height: 1.5;
  color: var(--grey);
}

/* Social card */

.yl-social {
  background: var(--card-bg);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
}

.yl-social a {
  color: var(--neon);
  display: block;
  line-height: 0;
  transition: color 0.2s ease, transform 0.2s ease;
}

.yl-social a:hover {
  color: var(--white);
  transform: scale(1.12);
}

.yl-social svg {
  width: 21px;
  height: 21px;
  fill: currentColor;
}

/* Full image clients card */

.yl-clients {
  grid-column: 4;
  grid-row: 1 / 21;
  position: relative;
  isolation: isolate;
  background: #303530;
  display: flex;
  align-items: flex-end;
  padding: 22px 16px 25px;
}

/* Full-size background image */

.yl-clients-image {
  position: absolute;
  inset: 0;
  z-index: -2;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: brightness(0.65) blur(1.5px);
  transform: scale(1.04);
}

/* Dark grey gradient overlay */

.yl-clients::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  background:
    linear-gradient(
      180deg,
      rgba(17, 21, 18, 0.2) 0%,
      rgba(17, 21, 18, 0.45) 35%,
      rgba(17, 21, 18, 0.92) 100%
    );
}

/* Client statistics */

.yl-stat {
  position: relative;
  z-index: 1;
  width: 100%;
  text-align: center;
}

.yl-stat strong {
  display: block;
  font-family: "Bricolage Grotesque", sans-serif;
  font-size: 2rem;
  line-height: 1.1;
  color: var(--neon);
}

.yl-stat span {
  display: block;
  font-size: 0.95rem;
  color: var(--white);
  margin-top: 5px;
}

.yl-dots {
  display: flex;
  gap: 6px;
  margin-top: 15px;
  justify-content: center;
}

.yl-dots i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--grey);
}

.yl-dots i:first-child {
  background: var(--neon);
}

/* Tablet */

@media (max-width: 900px) {
  .yl-bento {
    grid-template-columns: repeat(2, 1fr);
    grid-template-rows: none;
    grid-auto-rows: minmax(200px, auto);
    height: auto;
  }

  .yl-intro,
  .yl-tall,
  .yl-clients,
  .yl-photo,
  .yl-social,
  .yl-small {
    grid-column: auto;
    grid-row: auto;
  }

  .yl-intro {
    grid-column: 1 / 3;
    min-height: 250px;
  }

  .yl-clients {
    grid-column: 1 / 3;
    min-height: 350px;
  }

  .yl-tall {
    min-height: 280px;
  }
}

/* Mobile */

@media (max-width: 520px) {
  .yl-section {
    padding: 40px 18px;
  }

  .yl-bento {
    grid-template-columns: 1fr;
    grid-auto-rows: 200px;
    gap: 9px;
  }

  .yl-intro,
  .yl-clients,
  .yl-tall,
  .yl-photo,
  .yl-social,
  .yl-small {
    grid-column: auto;
    grid-row: auto;
  }

  .yl-intro {
    min-height: 240px;
    padding: 24px;
  }

  .yl-intro h2 {
    font-size: 1.8rem;
  }

  .yl-clients {
    min-height: 300px;
  }

  .yl-social {
    flex-direction: row;
    min-height: 100px;
  }

  .yl-social svg {
    width: 20px;
    height: 20px;
  }
}
`;

/* Images inside public/images */

const IMAGES = {
  tall: "../../src/assets/grid/3.png",
  photo: "../../src/assets/grid/4.png",
  small: "../../src/assets/grid/2.png",
  clients: "../../src/assets/grid/1.png",
};

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

const hideBroken = (e) => {
  e.currentTarget.style.display = "none";
};

export default function YardlineGridSection() {
  return (
    <section className="yl-section" aria-label="Yardline services">
      <style>{css}</style>

      <div className="yl-bento">
        {/* Intro card */}
        <div className="yl-card yl-intro">
          <div>
            <h2>Know exactly what is on every shelf</h2>
            <a className="yl-btn" href="#demo">
              Request a demo <span>↗</span>
            </a>
          </div>

          <p className="yl-note">
            Set up in an afternoon. No hidden costs. Free onboarding for your
            first warehouse.
          </p>
        </div>

        {/* Tall image */}
        <div className="yl-card yl-tall yl-slot">
          <img src={IMAGES.tall} alt="" onError={hideBroken} />
        </div>

        {/* Full image clients card */}
        <div className="yl-card yl-clients">
          <img
            className="yl-clients-image"
            src={IMAGES.clients}
            alt=""
            onError={hideBroken}
          />

          <div className="yl-stat">
            <strong>35+</strong>
            <span>Happy clients</span>

            <div className="yl-dots" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </div>
          </div>
        </div>

        {/* Bottom left image */}
        <div className="yl-card yl-photo yl-slot">
          <img src={IMAGES.photo} alt="" onError={hideBroken} />
        </div>

        {/* Social links */}
        <div className="yl-card yl-social">
          {SOCIALS.map((social) => (
            <a key={social.label} href={social.href} aria-label={social.label}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d={social.path} />
              </svg>
            </a>
          ))}
        </div>

        {/* Bottom middle image */}
        <div className="yl-card yl-small yl-slot">
          <img src={IMAGES.small} alt="" onError={hideBroken} />
        </div>
      </div>
    </section>
  );
}
