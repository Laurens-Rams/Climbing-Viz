import React, { useRef, useEffect, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText as GSAPSplitText } from "gsap/SplitText";

gsap.registerPlugin(ScrollTrigger, GSAPSplitText);

export interface SplitTextProps {
  text: string;
  className?: string;
  delay?: number;
  duration?: number;
  ease?: string | ((t: number) => number);
  splitType?: "chars" | "words" | "lines" | "words, chars";
  from?: gsap.TweenVars;
  to?: gsap.TweenVars;
  threshold?: number;
  rootMargin?: string;
  textAlign?: React.CSSProperties["textAlign"];
  onLetterAnimationComplete?: () => void;
}

const SplitText: React.FC<SplitTextProps> = ({
  text,
  className = "",
  delay = 100,
  duration = 0.6,
  ease = "power3.out",
  splitType = "chars",
  from = { opacity: 0, y: 40 },
  to = { opacity: 1, y: 0 },
  threshold = 0.1,
  rootMargin = "-100px",
  textAlign = "center",
  onLetterAnimationComplete,
}) => {
  const ref = useRef<HTMLParagraphElement>(null);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [animationReady, setAnimationReady] = useState(false);

  // Check if fonts are loaded
  useEffect(() => {
    const checkFonts = async () => {
      if (document.fonts && document.fonts.ready) {
        try {
          await document.fonts.ready;
          // Wait a bit more to ensure fonts are actually rendered
          await new Promise(resolve => setTimeout(resolve, 200));
          
          // Additional check for specific fonts if needed
          const fontLoaded = document.fonts.check('16px TT-Supermolot-Neue-Trial-Expanded-Bold, Arial, sans-serif');
          console.log('🔤 [SplitText] Fonts ready, TT-Supermolot loaded:', fontLoaded);
          setFontsLoaded(true);
        } catch (error) {
          console.warn('🔤 [SplitText] Font loading check failed, proceeding anyway:', error);
          // Wait longer before proceeding if there's an error
          setTimeout(() => setFontsLoaded(true), 500);
        }
      } else {
        // Fallback for browsers without font loading API - wait longer
        setTimeout(() => {
          console.log('🔤 [SplitText] No font loading API, using timeout fallback');
          setFontsLoaded(true);
        }, 500);
      }
    };

    checkFonts();
  }, []);

  useEffect(() => {
    if (!fontsLoaded) {
      console.log('🔤 [SplitText] Waiting for fonts to load...');
      return;
    }

    const el = ref.current;
    if (!el) return;

    console.log('🔤 [SplitText] Creating SplitText with fonts loaded');

    // Add a small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      try {
        const absoluteLines = splitType === "lines";
        if (absoluteLines) el.style.position = "relative";

        const splitter = new GSAPSplitText(el, {
          type: splitType,
          absolute: absoluteLines,
          linesClass: "split-line",
        });

        let targets: Element[];
        switch (splitType) {
          case "lines":
            targets = splitter.lines;
            break;
          case "words":
            targets = splitter.words;
            break;
          case "words, chars":
            targets = [...splitter.words, ...splitter.chars];
            break;
          default:
            targets = splitter.chars;
        }

        targets.forEach((t) => {
          (t as HTMLElement).style.willChange = "transform, opacity";
        });

        const startPct = (1 - threshold) * 100; // e.g. 0.1 -> 90%
        const m = /^(-?\d+)px$/.exec(rootMargin);
        const raw = m ? parseInt(m[1], 10) : 0;
        const sign = raw < 0 ? `-=${Math.abs(raw)}px` : `+=${raw}px`;
        const start = `top ${startPct}%${sign}`;

        // 5) Timeline with smoothChildTiming
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: el,
            start,
            toggleActions: "play none none none",
            once: true,
          },
          smoothChildTiming: true,
          onComplete: onLetterAnimationComplete,
        });

        // Apply initial state immediately to prevent flash
        gsap.set(targets, { ...from, force3D: true });
        
        // Keep container invisible until animation starts
        gsap.set(el, { opacity: 0 });
        
        tl.to(targets, {
          ...to,
          duration,
          ease,
          stagger: delay / 1000,
          force3D: true,
          onStart: () => {
            // Make container visible only when animation actually starts
            gsap.set(el, { opacity: 1 });
            setAnimationReady(true);
          }
        });

        return () => {
          tl.kill();
          ScrollTrigger.getAll().forEach((t) => t.kill());
          gsap.killTweensOf(targets);
          splitter.revert();
        };
      } catch (error) {
        console.error('🔤 [SplitText] Error creating SplitText:', error);
      }
    }, 50);

    return () => {
      clearTimeout(timer);
    };
  }, [
    fontsLoaded,
    text,
    delay,
    duration,
    ease,
    splitType,
    from,
    to,
    threshold,
    rootMargin,
    onLetterAnimationComplete,
  ]);

  return (
    <p
      ref={ref}
      className={`split-parent ${className}`}
      style={{
        textAlign,
        overflow: "visible",
        display: "inline-block",
        whiteSpace: "normal",
        wordWrap: "break-word",
        opacity: 0,
        transition: 'opacity 0.3s ease-in-out',
        visibility: fontsLoaded ? 'visible' : 'hidden',
        width: "100%",
        minHeight: "1.2em",
        padding: "0.2em 0"
      }}
    >
      {text}
    </p>
  );
};

export default SplitText;
