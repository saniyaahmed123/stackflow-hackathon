import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const services = [
  {
    id: 1,
    label: "3PL FULFILLMENT",
    icon: "box",
    title: "Outsource to a 3PL",
    description:
      "Done for you. A third-party logistics provider receives your inventory, stores it, picks and packs orders, ships them and handles returns. You keep no lease, no staff and no equipment.",
    features: [
      "Ecommerce fulfillment, B2B and retail distribution, EDI compliance",
      "Kitting, subscription boxes, climate controlled, hazmat, FDA registered",
      "Container receiving, drayage, transloading and freight support",
      "Three to five pre-screened matches, quotes direct from them",
    ],
    button: "Find my 3PL matches",
    link: "/login",
  },
  {
    id: 2,
    label: "WAREHOUSE LEASE",
    icon: "key",
    title: "Rent your own warehouse space",
    description:
      "Run it yourself. You lease the building and operate it with your own team. I work as your tenant rep: I find the space, flag what matters, negotiate the terms and stay on it through signing.",
    features: [
      "Industrial and distribution space from under 5,000 sq ft",
      "Dock doors, clear height, power, sprinklers, trailer parking, zoning",
      "Free rent, improvements and exit options pushed in your favor",
      "Short-term and flex space for companies expanding into the US",
    ],
    button: "Find my warehouse space",
    link: "/register",
  },
];

function ServiceIcon({ type }) {
  if (type === "box") {
    return (
      <svg
        viewBox="0 0 24 24"
        width="23"
        height="23"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
        <path d="m4 7.5 8 4.5 8-4.5M12 12v9M8 5.2l8 4.6" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      width="23"
      height="23"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="7.5" cy="16.5" r="3.5" />
      <path d="m10 14 9-9M15 5l4 4M13 7l4 4" />
    </svg>
  );
}

export default function YardlineServices() {
  const sectionRef = useRef(null);

  useEffect(() => {
    const section = sectionRef.current;

    if (!section) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray(".yardline-service-card");

      const mm = gsap.matchMedia();

      // DESKTOP ANIMATION
      mm.add("(min-width: 601px)", () => {
        gsap.fromTo(
          cards,
          {
            autoAlpha: 0,
            xPercent: (index) => (index === 0 ? 100 : -100),
            yPercent: (index) => (index === 0 ? -55 : 55),
            scale: 0.92,
          },
          {
            autoAlpha: 1,
            xPercent: 0,
            yPercent: 0,
            scale: 1,
            ease: "none",

            scrollTrigger: {
              trigger: section,
              start: "top 85%",
              end: "center 45%",
              scrub: 0.9,
              markers: false,
            },
          },
        );
      });

      // MOBILE ANIMATION
      mm.add("(max-width: 600px)", () => {
        gsap.fromTo(
          cards,
          {
            autoAlpha: 0,
            y: 100,
            scale: 0.95,
          },
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            ease: "none",

            scrollTrigger: {
              trigger: section,
              start: "top 85%",
              end: "center 50%",
              scrub: 0.9,
              markers: false,
            },
          },
        );
      });

      return () => mm.revert();
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section id="services" className="yardline-services" ref={sectionRef}>
      <div className="yardline-services-container">
        {/* Section Introduction */}

        <div className="yardline-services-intro">
          <span className="yardline-services-eyebrow">FIND YOUR SOLUTION</span>

          <h2>
            How would you like to
            <span> manage your warehouse?</span>
          </h2>

          <p>
            No reason to push you toward either one. Pick the side that sounds
            like you.
          </p>
        </div>

        {/* Service Cards */}

        <div className="yardline-services-grid">
          {services.map((service) => (
            <article key={service.id} className="yardline-service-card">
              {/* Category Tab */}

              <div className="yardline-service-tab">{service.label}</div>

              <div className="yardline-service-content">
                {/* Icon */}

                <div className="yardline-service-icon">
                  <ServiceIcon type={service.icon} />
                </div>

                {/* Heading */}

                <h3>{service.title}</h3>

                {/* Description */}

                <p className="yardline-service-description">
                  {service.description}
                </p>

                {/* Features */}

                <ul className="yardline-service-features">
                  {service.features.map((feature, index) => (
                    <li key={index}>
                      <span className="yardline-check">✓</span>

                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}

                <Link to={service.link} className="yardline-service-button">
                  {service.button}

                  <span className="yardline-button-arrow">↗</span>
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>

      <style>{`

        /* =========================
           MAIN SECTION
        ========================= */

        .yardline-services {
          width: 100%;
          background: #e8e9e5;
          padding: 100px 24px 115px;
          box-sizing: border-box;
          overflow: hidden;
          position: relative;
          scroll-margin-top: 80px;
        }

        .yardline-services-container {
          width: 100%;
          max-width: 1120px;
          margin: 0 auto;
        }

        /* =========================
           INTRO
        ========================= */

        .yardline-services-intro {
          text-align: center;
          max-width: 680px;
          margin: 0 auto 65px;
        }

        .yardline-services-eyebrow {
          display: inline-block;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 3px;
          color: #52634d;
          margin-bottom: 18px;
        }

        .yardline-services-intro h2 {
          font-size: clamp(32px, 4vw, 48px);
          line-height: 1.15;
          letter-spacing: -1.8px;
          color: #171b18;
          margin: 0 0 18px;
          font-weight: 750;
        }

        .yardline-services-intro h2 span {
          display: block;
          color: #52634d;
        }

        .yardline-services-intro p {
          font-size: 15px;
          line-height: 1.7;
          color: #626b62;
          margin: 0;
        }

        /* =========================
           CARDS GRID
        ========================= */

        .yardline-services-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 30px;
          align-items: stretch;
          perspective: 1200px;
        }

        /* =========================
           SERVICE CARDS
        ========================= */

        .yardline-service-card {
          position: relative;
          min-width: 0;
          box-sizing: border-box;

          background: #171b18;
          border: 2px solid #b6f36b;
          border-radius: 10px;

          padding: 32px 25px 24px;
          margin-top: 15px;

          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.13);

          transition:
            box-shadow 0.35s ease,
            border-color 0.35s ease;
        }

        .yardline-service-card:hover {
          border-color: #d0ff96;

          box-shadow:
            0 18px 40px rgba(0, 0, 0, 0.2),
            0 0 18px rgba(182, 243, 107, 0.12);
        }

        /* =========================
           TOP CATEGORY TAB
        ========================= */

        .yardline-service-tab {
          position: absolute;
          top: -26px;
          left: -2px;

          padding: 8px 20px 9px;

          background: #b6f36b;
          color: #111810;

          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1px;

          clip-path: polygon(
            0 0,
            85% 0,
            100% 100%,
            0 100%
          );
        }

        /* =========================
           CARD CONTENT
        ========================= */

        .yardline-service-content {
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        /* ICON */

        .yardline-service-icon {
          width: 42px;
          height: 42px;

          display: flex;
          align-items: center;
          justify-content: center;

          background: rgba(182, 243, 107, 0.13);
          color: #b6f36b;

          border: 1px solid rgba(182, 243, 107, 0.3);
          border-radius: 9px;

          margin-bottom: 16px;
        }

        /* HEADING */

        .yardline-service-card h3 {
          color: #ffffff;
          font-size: 22px;
          font-weight: 750;
          letter-spacing: -0.6px;
          line-height: 1.3;
          margin: 0 0 10px;
        }

        /* DESCRIPTION */

        .yardline-service-description {
          color: #b5bcb5;
          font-size: 13px;
          line-height: 1.75;
          margin: 0 0 22px;
        }

        /* =========================
           FEATURES
        ========================= */

        .yardline-service-features {
          list-style: none;
          padding: 0;
          margin: 0 0 28px;

          display: flex;
          flex-direction: column;
          gap: 13px;
        }

        .yardline-service-features li {
          display: flex;
          align-items: flex-start;
          gap: 11px;

          color: #d0d5cf;
          font-size: 12px;
          line-height: 1.7;
        }

        .yardline-check {
          color: #b6f36b;
          font-size: 16px;
          font-weight: 800;
          flex-shrink: 0;
          line-height: 1.4;
        }

        /* =========================
           CTA BUTTON
        ========================= */

        .yardline-service-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;

          width: 100%;
          box-sizing: border-box;

          margin-top: auto;
          padding: 15px 18px;

          background: #b6f36b;
          color: #111810;

          border: 1px solid #b6f36b;
          border-radius: 5px;

          font-size: 12px;
          font-weight: 800;
          text-decoration: none;

          transition:
            background-color 0.3s ease,
            border-color 0.3s ease,
            box-shadow 0.3s ease;
        }

        .yardline-service-button:hover {
          background: #d0ff96;
          border-color: #d0ff96;

          box-shadow:
            0 0 20px rgba(182, 243, 107, 0.2);
        }

        .yardline-button-arrow {
          font-size: 17px;
          line-height: 1;

          transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .yardline-service-button:hover
        .yardline-button-arrow {
          transform: translate(3px, -3px);
        }

        /* =========================
           TABLET
        ========================= */

        @media (max-width: 900px) {
          .yardline-services-grid {
            gap: 22px;
          }

          .yardline-service-card {
            padding: 30px 18px 22px;
          }

          .yardline-service-card h3 {
            font-size: 19px;
          }
        }

        /* =========================
           MOBILE
        ========================= */

        @media (max-width: 600px) {
          .yardline-services {
            padding: 75px 20px 85px;
          }

          .yardline-services-intro {
            margin-bottom: 50px;
          }

          .yardline-services-grid {
            grid-template-columns: 1fr;
            gap: 35px;
          }

          .yardline-service-card {
            padding: 30px 20px 22px;
          }

          .yardline-service-card h3 {
            font-size: 20px;
          }

          .yardline-service-description {
            font-size: 13px;
          }
        }

        /* =========================
           REDUCED MOTION
        ========================= */

        @media (prefers-reduced-motion: reduce) {
          .yardline-service-card,
          .yardline-service-button,
          .yardline-button-arrow {
            transition: none;
          }
        }

      `}</style>
    </section>
  );
}
