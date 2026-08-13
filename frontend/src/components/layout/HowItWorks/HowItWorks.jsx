import React from "react";
import "./HowItWorks.css";

/**
 * The HowItWorks component acts as a high-level marketing block to explain the transition from
 * raw discussions to a structured PRD using the Nexus platform. 
 * 
 * It renders a relatively simple, static UI component structured with specific CSS classes 
 * that are defined in an external stylesheet (`HowItWorks.css`). The component currently holds no
 * internal React state, triggers no side effects, and receives no props. It returns a straightforward 
 * semantic layout showcasing subtitles, a primary title, a descriptive paragraph, and placeholder 
 * card slots meant to illustrate the steps involved in requirement documentation.
 * 
 * @returns {JSX.Element} A `<div>` container with class `how-it-works` encompassing the instructional marketing content.
 */
const HowItWorks = () => {
  return (
    <div className="how-it-works">
      <p className="how-it-works-subtitle">HOW NEXUS WORKS</p>
      <h2 className="how-it-works-title">
        From raw discussions to a structured PRD.
      </h2>
      <p className="how-it-works-desc">
        Nexus guides your team through every stage of requirement documentation
        without losing important context.
      </p>
      <div className="how-it-works-cards">
        <div className="how-it-works-card-add">
          <p>add</p>
        </div>
      </div>
    </div>
  );
};

export default HowItWorks;
