import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { Squircle } from "../../src/react/index.js";

function Examples() {
  const [asLink, setAsLink] = useState(false);
  return (
    <main>
      <header>
        <div>
          <h1>squircles with React</h1>
          <p>Native elements with smoother corners. Styling stays in CSS.</p>
        </div>
        <nav aria-label="Examples"><a href="/">Back to playground</a><a href="/svelte/">Svelte</a></nav>
      </header>

      <section className="examples" aria-labelledby="buttons">
        <h2 id="buttons">Buttons and links</h2>
        <div className="row">
          <Squircle as="button" type="button" className="button">Learn more</Squircle>
          <Squircle as="a" href="#host-change" className="button button--light">See the examples</Squircle>
        </div>
        <p className="note">Style hover, focus outlines, and backgrounds in ordinary CSS.</p>
      </section>

      <section className="examples" aria-labelledby="more-elements">
        <h2 id="more-elements">Card, image, and input</h2>
        <div className="row">
          <Squircle as="article" className="card">
            <Squircle as="img" className="card-image" src="/examples/shapes.svg" alt="Two smoothed shapes in grayscale" />
            <div className="card-body"><b>A card with smoother corners.</b><span>Background, border, and shadow stay in CSS.</span></div>
          </Squircle>
          <div className="stack">
            <label className="field"><span>Text input</span><Squircle as="input" className="input" defaultValue="Your text" /></label>
            <Squircle as="span" className="badge">No extra wrapper</Squircle>
          </div>
        </div>
      </section>

      <section className="examples" id="host-change" aria-labelledby="switch">
        <h2 id="switch">Switch the element</h2>
        <div className="row">
          <button className="button button--light" type="button" onClick={() => setAsLink(!asLink)}>Switch element</button>
          {asLink
            ? <Squircle as="a" href="#switch" className="button" data-switch>Now a link</Squircle>
            : <Squircle as="button" type="button" className="button" data-switch>Now a button</Squircle>}
        </div>
        <p className="note">The shape follows the new element; old observers are removed.</p>
      </section>
    </main>
  );
}

const container = document.getElementById("root");
if (container) createRoot(container).render(<StrictMode><Examples /></StrictMode>);
