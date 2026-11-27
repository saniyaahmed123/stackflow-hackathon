import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import headerImage from "../../src/assets/header.png";

export default function Header() {
  const headerRef = useRef(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      const timeline = gsap.timeline({
        defaults: {
          ease: "power3.out",
        },
      });

      // Background zoom animation
      timeline.fromTo(
        ".yardline-header-bg",
        { scale: 1.2 },
        {
          scale: 1,
          duration: 2,
          ease: "power2.out",
        },
        0,
      );

      // Label animation
      timeline.fromTo(
        ".yardline-header-label",
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
        },
        0.4,
      );

      // Heading animation
      timeline.fromTo(
        ".yardline-heading-line",
        {
          y: 80,
          opacity: 0,
          rotateX: -15,
        },
        {
          y: 0,
          opacity: 1,
          rotateX: 0,
          duration: 1,
          stagger: 0.2,
        },
        0.6,
      );

      // Description animation
      timeline.fromTo(
        ".yardline-header-description",
        { y: 35, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.9,
        },
        1.3,
      );

      // Buttons animation
      timeline.fromTo(
        ".yardline-btn",
        { y: 25, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          stagger: 0.15,
        },
        1.5,
      );
    }, headerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section className="yardline-header" ref={headerRef}>
      {/* Background Image */}
      <div
        className="yardline-header-bg"
        style={{
          backgroundImage: `url(${headerImage})`,
        }}
      />

      {/* Dark Overlay */}
      <div className="yardline-header-overlay" />

      {/* Header Content */}
      <div className="yardline-header-content">
        <span className="yardline-header-label">
          SMART YARD MANAGEMENT PLATFORM
        </span>

        <h1>
          <span className="yardline-heading-line">Transform Your Yard.</span>

          <span className="yardline-heading-line highlight">
            Control Everything.
          </span>
        </h1>

        <p className="yardline-header-description">
          Take control of your yard operations with one connected platform.
          Manage inventory, track activity, and make smarter decisions.
        </p>

        <div className="yardline-header-buttons">
          <Link to="/login" className="yardline-btn yardline-btn-primary">
            Explore Platform
            <span className="btn-arrow">↗</span>
          </Link>

          <Link to="/register" className="yardline-btn yardline-btn-outline">
            Request Demo
            <span className="btn-arrow">↗</span>
          </Link>
        </div>
      </div>

      {/* Curved Bottom Border */}
      <div className="yardline-header-bottom">
        <div className="yardline-header-bottom">
          <svg
            viewBox="0 0 1440 100"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="
        M0 35
        H220
        C260 35 270 0 310 0
        H1130
        C1170 0 1180 35 1220 35
        H1440
        V100
        H0
        Z
      "
              fill="#d9dad5"
            />
          </svg>
        </div>
      </div>

      <style>{`
        .yardline-header {
          min-height: 680px;
          width: 100%;
          position: relative;
          display: flex;
          align-items: center;
          overflow: hidden;
          background: #080d0a;
          isolation: isolate;
        }

        /* Background Image */

        .yardline-header-bg {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          z-index: -2;
        }

        /* Dark Overlay */

        .yardline-header-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            90deg,
            rgba(5, 12, 10, 0.92) 0%,
            rgba(5, 12, 10, 0.75) 45%,
            rgba(5, 12, 10, 0.25) 100%
          );
          z-index: -1;
        }

        /* Header Content */

        .yardline-header-content {
          width: 100%;
          max-width: 1250px;
          margin: 0 auto;
          padding: 110px 40px 150px;
          color: #ffffff;
          position: relative;
          z-index: 3;
        }

        /* Label */

        .yardline-header-label {
          display: inline-block;
          color: #b6f36b;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 3px;
          margin-bottom: 28px;
        }

        /* Heading */

        .yardline-header h1 {
          font-size: clamp(44px, 6vw, 78px);
          line-height: 1.08;
          font-weight: 700;
          letter-spacing: -2.5px;
          max-width: 850px;
          margin: 0 0 28px;
          perspective: 800px;
        }

        .yardline-heading-line {
          display: block;
          opacity: 0;
        }

        .yardline-header h1 .highlight {
          color: #b6f36b;
        }

        /* Description */

        .yardline-header-description {
          max-width: 560px;
          color: rgba(255, 255, 255, 0.78);
          font-size: 17px;
          line-height: 1.8;
          margin-bottom: 38px;
        }

        /* Buttons */

        .yardline-header-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
        }

        .yardline-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 18px;
          padding: 16px 25px;
          border-radius: 0;
          text-decoration: none;
          font-size: 14px;
          font-weight: 700;
          transition:
            transform 0.3s cubic-bezier(0.22, 1, 0.36, 1),
            background-color 0.3s ease,
            color 0.3s ease;
        }

        .yardline-btn-primary {
          background: #b6f36b;
          color: #101810;
        }

        .yardline-btn-primary:hover {
          background: #d0ff96;
          transform: translateY(-4px);
        }

        .yardline-btn-outline {
          border: 1px solid rgba(255, 255, 255, 0.6);
          color: #ffffff;
        }

        .yardline-btn-outline:hover {
          background: #ffffff;
          color: #101810;
          transform: translateY(-4px);
        }

        .btn-arrow {
          font-size: 17px;
          transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .yardline-btn:hover .btn-arrow {
          transform: translate(3px, -3px);
        }

        /* Curved Bottom Border */

        .yardline-header-bottom {
          position: absolute;
          bottom: -1px;
          left: 0;
          width: 100%;
          height: 100px;
          z-index: 2;
          pointer-events: none;
        }

        .yardline-header-bottom svg {
          display: block;
          width: 100%;
          height: 100%;
        }

        /* Tablet */

        @media (max-width: 768px) {
          .yardline-header {
            min-height: 600px;
          }

          .yardline-header-content {
            padding: 90px 25px 130px;
          }

          .yardline-header h1 {
            font-size: 48px;
            letter-spacing: -1.5px;
          }

          .yardline-header-description {
            font-size: 15px;
          }

          .yardline-header-bg {
            background-position: center;
          }

          .yardline-header-bottom {
            height: 75px;
          }
        }

        /* Mobile */

        @media (max-width: 480px) {
          .yardline-header {
            min-height: 580px;
          }

          .yardline-header-content {
            padding: 75px 22px 110px;
          }

          .yardline-header-label {
            font-size: 10px;
            letter-spacing: 2px;
          }

          .yardline-header h1 {
            font-size: 38px;
            letter-spacing: -1px;
          }

          .yardline-header-buttons {
            flex-direction: column;
            align-items: stretch;
          }

          .yardline-btn {
            width: 100%;
            box-sizing: border-box;
          }

          .yardline-header-bottom {
            height: 55px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .yardline-header-bg {
            transform: none !important;
          }

          .yardline-heading-line {
            opacity: 1;
          }
        }
      `}</style>
    </section>
  );
}
