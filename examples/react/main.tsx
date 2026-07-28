import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Squircle } from "../../src/react/index.js";

function Demo() {
  return (
    <main>
      <header>
        <h1>squircles with React</h1>
        <p>
          Every shape below is styled in plain CSS. The components receive no
          paint props at all — only <code>as</code> and a class name.
        </p>
      </header>

      <section>
        <h2>Buttons</h2>
        <div className="row">
          <Squircle as="button" type="button" className="button">
            Mehr erfahren
          </Squircle>

          <Squircle as="a" href="#kontakt" className="button button--ghost">
            Kontakt
          </Squircle>
        </div>
        <p className="note">
          Hover them: the fill transitions, and the geometry is not recalculated
          for a colour change.
        </p>
      </section>

      <section>
        <h2>Card, image, input, badge</h2>
        <div className="row">
          <Squircle as="article" className="card">
            <Squircle
              as="img"
              className="card__image"
              src="../../docs/media/playground.png"
              alt=""
            />
            <div className="card__body">
              <b>Card mit Schatten</b>
              <span>Background, border, and shadow all come from CSS.</span>
            </div>
          </Squircle>

          <div className="stack">
            <Squircle as="input" className="input" defaultValue="Eingabefeld" />
            <Squircle as="span" className="badge">
              Badge
            </Squircle>
          </div>
        </div>
      </section>
    </main>
  );
}

const container = document.getElementById("root");

if (container) {
  createRoot(container).render(
    <StrictMode>
      <Demo />
    </StrictMode>,
  );
}
