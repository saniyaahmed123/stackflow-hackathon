import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const stats = [
  { number: 64265, suffix: "", label: "Companies" },
  { number: 5961, suffix: "", label: "Providers" },
  { number: 500, suffix: "+", label: "Properties" },
  { number: 2005, suffix: "", label: "Established" },
];

export default function StatsSection() {
  const sectionRef = useRef(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      sectionRef.current?.querySelectorAll(".simple-stat-number").forEach((element) => {
        element.textContent =
          Number(element.dataset.value).toLocaleString("en-US") +
          element.dataset.suffix;
      });

      return;
    }

    const ctx = gsap.context(() => {
      gsap.from(".simple-stat", {
        opacity: 0,
        y: 15,
        duration: 0.7,
        stagger: 0.12,
        ease: "power2.out",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 90%",
          once: true,
        },
      });

      gsap.utils.toArray(".simple-stat-number").forEach((element) => {
        const target = Number(element.dataset.value);
        const suffix = element.dataset.suffix;
        const counter = { value: 0 };
        let rendered = -1;

        gsap.to(counter, {
          value: target,
          duration: 2,
          ease: "power2.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 90%",
            once: true,
          },
          onUpdate: () => {
            const value = Math.floor(counter.value);

            if (value === rendered) return;

            rendered = value;
            element.textContent = value.toLocaleString("en-US") + suffix;
          },
        });
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section className="simple-stats" ref={sectionRef}>
      <div className="simple-stats-row">
        {stats.map((stat) => (
          <div className="simple-stat" key={stat.label}>
            <span
              className="simple-stat-number"
              data-value={stat.number}
              data-suffix={stat.suffix}
            >
              0
            </span>
            <span className="simple-stat-label">{stat.label}</span>
          </div>
        ))}
      </div>

      <style>{`
        .simple-stats {
          width: 100%;
          padding: 30px 7%;
          background: #DADBD6;
          box-sizing: border-box;
        }

        .simple-stats-row {
          max-width: 1250px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .simple-stat {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
          text-align: center;
        }

        .simple-stat-number {
          color: #53664F;
          font-size: clamp(30px, 6.2vw, 66px);
          font-weight: 700;
          letter-spacing: -1.5px;
          font-variant-numeric: tabular-nums;
        }

        .simple-stat-label {
          color: #555D53;
          font-size: 12px;
          letter-spacing: 0.5px;
        }

        @media (max-width: 600px) {
          .simple-stats {
            padding: 25px 12px;
          }

          .simple-stats-row {
            flex-wrap: wrap;
            row-gap: 22px;
          }

          .simple-stat {
            flex: 0 0 50%;
          }

          .simple-stat-number {
            font-size: 29px;
          }
        }
      `}</style>
    </section>
  );
}
