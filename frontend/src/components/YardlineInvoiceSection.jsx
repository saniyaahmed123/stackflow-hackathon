import { useEffect, useRef, useState } from "react";

// All styles for this section live here, so the component works as a single file.
const css = `
@import url("https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700&family=DM+Sans:wght@400;500;700&display=swap");

.yli-section {
  --neon: #b6f36b;
  --white: #ffffff;
  --black: #111512;
  --dark-green: #123b28;
  --grey: #a5aaa5;
  --light-grey: #d9dad5;
  --muted: #5f645f; /* darker grey so small text is readable on white */

  background: var(--black);
  color: var(--white);
  font-family: "DM Sans", system-ui, sans-serif;
  padding: 96px 24px;
  margin-top: 28px; /* room for the raised corners above */
  position: relative;
}
.yli-section *,
.yli-section *::before,
.yli-section *::after { box-sizing: border-box; }
.yli-section h2,
.yli-section h3,
.yli-section p,
.yli-section ul { margin: 0; padding: 0; }

.yli-inner {
  max-width: 1100px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 6fr 6fr;
  gap: 72px;
  align-items: start;
}

/* ---------- Invoice paper ---------- */
.yli-invoice {
  position: relative;
  background: var(--white);
  color: var(--black);
  padding: 44px 36px 36px;
  opacity: 0;
  transform: translateY(80px) rotate(-6deg);
  transform-origin: 50% 0;
  box-shadow: 0 24px 50px rgba(0, 0, 0, 0.35);
  transition: opacity 0.6s ease, transform 1.1s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.4s ease;
}
/* perforated top edge */
.yli-invoice::before {
  content: "";
  position: absolute;
  left: 0; right: 0; top: -1px;
  height: 12px;
  background: radial-gradient(circle at 8px 0, var(--black) 5px, transparent 5.5px) repeat-x;
  background-size: 16px 12px;
}

.yli-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}
.yli-brand {
  font-family: "Bricolage Grotesque", sans-serif;
  font-weight: 700;
  font-size: 1.3rem;
}
.yli-tag {
  margin-top: 4px;
  font-size: 0.82rem;
  color: var(--muted);
}
.yli-title {
  font-family: "Bricolage Grotesque", sans-serif;
  font-weight: 700;
  font-size: 1.7rem;
  letter-spacing: 0.12em;
  color: var(--dark-green);
}

.yli-billed {
  display: flex;
  align-items: baseline;
  gap: 14px;
  margin: 32px 0 20px;
}
.yli-billed small {
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  color: var(--muted);
}
.yli-billed strong {
  font-family: "Bricolage Grotesque", sans-serif;
  font-size: 1.1rem;
}

.yli-lines { list-style: none; }
.yli-line {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 12px 0;
  font-size: 1rem;
}
.yli-line::after { content: none; }
.yli-dots {
  flex: 1;
  border-bottom: 2px dotted var(--light-grey);
  transform: translateY(-4px);
}
.yli-price { font-weight: 700; white-space: nowrap; }

.yli-total {
  position: relative;
  margin-top: 18px;
  padding: 22px 20px;
  background: var(--light-grey);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.yli-total small {
  font-size: 0.8rem;
  letter-spacing: 0.14em;
  color: var(--muted);
}
.yli-amount {
  font-family: "Bricolage Grotesque", sans-serif;
  font-weight: 700;
  font-size: 2.2rem;
}
.yli-stamp {
  position: absolute;
  left: 22px; top: 50%;
  transform: translateY(-50%) rotate(-8deg);
  padding: 6px 14px;
  border: 3px solid var(--dark-green);
  border-radius: 0;
  color: var(--dark-green);
  font-family: "Bricolage Grotesque", sans-serif;
  font-weight: 700;
  font-size: 1.15rem;
  letter-spacing: 0.06em;
  opacity: 0;
  mix-blend-mode: multiply;
  background: rgba(255, 255, 255, 0.35);
}

.yli-terms { margin-top: 24px; }
.yli-terms small {
  display: block;
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  color: var(--muted);
  margin-bottom: 6px;
}
.yli-terms p {
  max-width: 40ch;
  font-size: 0.85rem;
  line-height: 1.55;
  color: var(--muted);
}

/* ---------- Right side ---------- */
.yli-copy h2 {
  font-family: "Bricolage Grotesque", sans-serif;
  font-size: clamp(1.7rem, 3vw, 2.2rem);
  line-height: 1.15;
  letter-spacing: -0.015em;
  margin-bottom: 28px;
}
.yli-points { list-style: none; display: grid; gap: 22px; }
.yli-point {
  display: grid;
  grid-template-columns: 26px 1fr;
  gap: 14px;
  line-height: 1.6;
  color: var(--light-grey);
}
.yli-point b { color: var(--white); font-weight: 700; }
.yli-point svg { width: 26px; height: 26px; margin-top: 2px; }

.yli-note {
  margin-top: 36px;
  display: grid;
  grid-template-columns: 26px 1fr;
  gap: 14px;
  padding: 24px;
  background: var(--neon);
  color: var(--black);
  border-radius: 0;
  line-height: 1.6;
}
.yli-note svg { width: 24px; height: 24px; margin-top: 2px; }
.yli-note b { font-weight: 700; }

/* ---------- Raised corners on the top edge ---------- */
.yli-edge {
  position: absolute;
  left: 0; right: 0; top: -27px;
  height: 28px;
  display: flex;
  justify-content: space-between;
  pointer-events: none;
}
.yli-ear { display: flex; height: 100%; }
.yli-ear-body { width: clamp(24px, 16vw, 260px); background: var(--black); }
.yli-ear svg { width: 90px; height: 100%; display: block; fill: var(--black); }
.yli-ear-r svg { transform: scaleX(-1); }

/* ---------- Animation (starts when the section scrolls into view) ---------- */
.yli-line {
  opacity: 0;
  transform: translateX(-14px);
}
.yli-dots { transform: translateY(-4px) scaleX(0); transform-origin: left; }
.yli-amount { opacity: 0; transform: scale(0.8); }
.yli-point, .yli-note { opacity: 0; transform: translateY(18px); }

.is-in .yli-invoice {
  opacity: 1;
  transform: rotate(-1deg);
}
.is-in .yli-invoice:hover {
  transform: rotate(0deg) translateY(-6px);
  box-shadow: 0 34px 60px rgba(0, 0, 0, 0.45);
}
.is-in .yli-line {
  opacity: 1;
  transform: none;
  transition: opacity 0.5s ease, transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
  transition-delay: calc(0.6s + var(--i) * 0.13s);
}
.is-in .yli-dots {
  transform: translateY(-4px) scaleX(1);
  transition: transform 0.8s cubic-bezier(0.22, 1, 0.36, 1);
  transition-delay: calc(0.7s + var(--i) * 0.13s);
}
.is-in .yli-amount {
  opacity: 1;
  transform: none;
  transition: opacity 0.4s ease 1.6s, transform 0.6s cubic-bezier(0.22, 1, 0.36, 1) 1.6s;
}
.is-in .yli-stamp {
  opacity: 0.85;
  animation: yli-stamp 0.45s cubic-bezier(0.2, 0.9, 0.3, 1) 2s both;
}
.is-in .yli-point,
.is-in .yli-note {
  opacity: 1;
  transform: none;
  transition: opacity 0.6s ease, transform 0.7s cubic-bezier(0.22, 1, 0.36, 1);
  transition-delay: calc(0.3s + var(--i) * 0.14s);
}

@keyframes yli-stamp {
  0%   { opacity: 0; transform: translateY(-50%) rotate(-2deg) scale(2.6); }
  70%  { opacity: 0.95; transform: translateY(-50%) rotate(-9deg) scale(0.94); }
  100% { opacity: 0.85; transform: translateY(-50%) rotate(-8deg) scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .yli-section *, .yli-section *::before, .yli-section *::after {
    transition: none !important;
    animation: none !important;
  }
}

/* ---------- Small screens ---------- */
@media (max-width: 860px) {
  .yli-section { padding: 64px 20px; }
  .yli-inner { grid-template-columns: 1fr; gap: 56px; }
}
@media (max-width: 480px) {
  .yli-invoice { padding: 40px 20px 28px; }
  .yli-stamp { font-size: 0.9rem; left: 12px; }
  .yli-amount { font-size: 1.7rem; }
}
`;

const LINES = [
  "Receiving stock against purchase orders",
  "Tracking every shelf and bin",
  "Low-stock and reorder alerts",
  "Moving stock between warehouses",
  "Pick lists for every sales order",
  "A full activity log of every change",
];

const POINTS = [
  {
    lead: "Every feature is in every plan.",
    text: " No locked tiers, so you never hit a wall the week your team grows.",
  },
  {
    lead: "No charge per user.",
    text: " Add the whole floor team and your manager without watching the bill climb.",
  },
  {
    lead: "Moving stock costs nothing.",
    text: " Transfers between warehouses are never counted or billed.",
  },
  {
    lead: "Your data stays yours.",
    text: " Export all of it whenever you want, with no fee and no call to sales.",
  },
];

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="#b6f36b"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M7.5 12.5l3 3 6-7" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="#111512"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 11v5M12 7.5v.5" />
    </svg>
  );
}

export default function YardlineInvoiceSection() {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  // Start the animation once, when the section scrolls into view.
  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className={`yli-section${inView ? " is-in" : ""}`}
      aria-labelledby="yli-heading"
    >
      <style>{css}</style>

      {/* Raised corners on the top edge */}
      <div className="yli-edge" aria-hidden="true">
        <div className="yli-ear">
          <div className="yli-ear-body" />
          <svg viewBox="0 0 90 28" preserveAspectRatio="none">
            <path d="M0 0 H90 V28 H0 Z" />
          </svg>
        </div>
        <div className="yli-ear yli-ear-r">
          <svg viewBox="0 0 90 28" preserveAspectRatio="none">
            <path d="M0 0 H90 V28 H0 Z" />
          </svg>
          <div className="yli-ear-body" />
        </div>
      </div>

      <div className="yli-inner">
        {/* Invoice card */}
        <div
          className="yli-invoice"
          role="img"
          aria-label="Invoice showing everything in Parcel Point is included"
        >
          <div className="yli-top">
            <div>
              <div className="yli-brand">Parcel Point</div>
              <div className="yli-tag">Inventory and warehouse management</div>
            </div>
            <div className="yli-title">INVOICE</div>
          </div>

          <div className="yli-billed">
            <small>BILLED TO</small>
            <strong>You</strong>
          </div>

          <ul className="yli-lines">
            {LINES.map((line, i) => (
              <li className="yli-line" key={line} style={{ "--i": i }}>
                <span>{line}</span>
                <span className="yli-dots" />
                <span className="yli-price">Included</span>
              </li>
            ))}
          </ul>

          <div className="yli-total">
            <small>TOTAL DUE</small>
            <span className="yli-stamp">PAID IN FULL</span>
            <span className="yli-amount">$0.00</span>
          </div>

          <div className="yli-terms">
            <small>TERMS</small>
            <p>
              No extra charge per user, per warehouse or per feature. What you
              see on this invoice is the whole bill.
            </p>
          </div>
        </div>

        {/* Copy */}
        <div className="yli-copy">
          <h2 id="yli-heading">Why you never get a surprise bill</h2>

          <ul className="yli-points">
            {POINTS.map((p, i) => (
              <li className="yli-point" key={p.lead} style={{ "--i": i }}>
                <CheckIcon />
                <p>
                  <b>{p.lead}</b>
                  {p.text}
                </p>
              </li>
            ))}
          </ul>

          <div className="yli-note" style={{ "--i": POINTS.length }}>
            <InfoIcon />
            <p>
              <b>Worth asking any inventory software you try:</b> "What happens
              to my bill when I add another user or another warehouse?" If the
              answer is a bigger invoice, that cost was always part of the
              price, just hidden until you grew.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
