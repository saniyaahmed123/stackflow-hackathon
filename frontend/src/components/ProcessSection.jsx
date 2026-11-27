import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const steps = [
  {
    title: "Tell us what you need.",
    description:
      "Start with the basics. Tell us about your business, the space you need, and how you want your operations to work.",
  },
  {
    title: "Find the right space.",
    description:
      "Explore warehouse spaces and fulfillment options that match your location, storage, and business requirements.",
  },
  {
    title: "Compare your options.",
    description:
      "Look through the details, compare services, and see which option makes the most sense for your business.",
  },
  {
    title: "Get things moving.",
    description:
      "Choose the solution that works for you and take the next step with your warehouse operations.",
  },
];

export default function ProcessSection() {
  const sectionRef = useRef(null);
  const stepsRef = useRef([]);

  useEffect(() => {
    const section = sectionRef.current;

    if (!section) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      const stepElements = stepsRef.current.filter(Boolean);

      if (!stepElements.length) return;

      gsap.set(stepElements, {
        autoAlpha: 0,
        y: 35,
      });

      gsap.set(stepElements[0], {
        autoAlpha: 1,
        y: 0,
      });

      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: `+=${(steps.length - 1) * 900}`,
          pin: true,
          scrub: 0.9,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      stepElements.forEach((step, index) => {
        if (index === 0) return;

        const previousStep = stepElements[index - 1];
        const position = index - 1;

        timeline.to(
          previousStep,
          {
            autoAlpha: 0,
            y: -30,
            duration: 0.45,
            ease: "power2.in",
          },
          position,
        );

        timeline.fromTo(
          step,
          {
            autoAlpha: 0,
            y: 35,
          },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.55,
            ease: "power2.out",
          },
          position + 0.2,
        );
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section id="process" className="yardline-process" ref={sectionRef}>
      <div className="yardline-process-container">
        <div className="yardline-process-heading">
          <p>HOW IT WORKS</p>

          <h2>
            A better way to
            <br />
            <span>move your business forward.</span>
          </h2>
        </div>

        <div className="yardline-process-content">
          <div className="yardline-process-intro">
            <p>THE PROCESS</p>
            <span>
              From finding the right space to getting your operations moving, we
              make the process simpler.
            </span>
          </div>

          <div className="yardline-process-steps">
            {steps.map((step, index) => (
              <article
                key={index}
                ref={(element) => {
                  stepsRef.current[index] = element;
                }}
                className="yardline-process-step"
              >
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .yardline-process {
          width: 100%;
          min-height: 100vh;
          background: #111512;
          color: #ffffff;
          padding: 100px 7%;
          display: flex;
          align-items: center;
          overflow: hidden;
          box-sizing: border-box;
          scroll-margin-top: 80px;
        }

        .yardline-process-container {
          width: 100%;
          max-width: 1250px;
          margin: 0 auto;
        }

        .yardline-process-heading {
          margin-bottom: 85px;
        }

        .yardline-process-heading > p {
          color: #b6f36b;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 2px;
          margin-bottom: 22px;
        }

        .yardline-process-heading h2 {
          font-size: clamp(38px, 6vw, 76px);
          line-height: 1.08;
          letter-spacing: -3px;
          font-weight: 500;
          margin: 0;
        }

        .yardline-process-heading h2 span {
          color: #b6f36b;
        }

        .yardline-process-content {
          display: grid;
          grid-template-columns: 0.8fr 1.2fr;
          gap: 100px;
          align-items: center;
          border-top: 1px solid rgba(255, 255, 255, 0.15);
          padding-top: 45px;
        }

        .yardline-process-intro {
          align-self: start;
        }

        .yardline-process-intro p {
          color: #b6f36b;
          font-size: 12px;
          letter-spacing: 1.8px;
          font-weight: 600;
          margin: 0 0 20px;
        }

        .yardline-process-intro span {
          display: block;
          max-width: 330px;
          color: #a5aaa5;
          font-size: 17px;
          line-height: 1.7;
        }

        .yardline-process-steps {
          position: relative;
          min-height: 260px;
        }

        .yardline-process-step {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
          visibility: hidden;
        }

        .yardline-process-step h3 {
          max-width: 700px;
          color: #ffffff;
          font-size: clamp(38px, 5vw, 68px);
          line-height: 1.1;
          font-weight: 500;
          letter-spacing: -2.5px;
          margin: 0 0 25px;
        }

        .yardline-process-step p {
          max-width: 560px;
          color: #a5aaa5;
          font-size: 18px;
          line-height: 1.7;
          margin: 0;
        }

        @media (max-width: 900px) {
          .yardline-process {
            padding: 80px 6%;
          }

          .yardline-process-heading {
            margin-bottom: 60px;
          }

          .yardline-process-content {
            grid-template-columns: 1fr;
            gap: 45px;
          }

          .yardline-process-intro span {
            max-width: 500px;
          }

          .yardline-process-steps {
            min-height: 250px;
          }
        }

        @media (max-width: 600px) {
          .yardline-process {
            min-height: 100svh;
            padding: 65px 22px;
          }

          .yardline-process-heading {
            margin-bottom: 45px;
          }

          .yardline-process-heading h2 {
            letter-spacing: -1.5px;
          }

          .yardline-process-content {
            padding-top: 30px;
            gap: 35px;
          }

          .yardline-process-intro span {
            font-size: 15px;
          }

          .yardline-process-steps {
            min-height: 280px;
          }

          .yardline-process-step h3 {
            font-size: 42px;
            letter-spacing: -1.5px;
            margin-bottom: 18px;
          }

          .yardline-process-step p {
            font-size: 16px;
            line-height: 1.65;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .yardline-process-step {
            position: relative;
            visibility: visible;
            margin-bottom: 35px;
          }

          .yardline-process-steps {
            min-height: auto;
          }
        }
      `}</style>
    </section>
  );
}
