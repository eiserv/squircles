import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { Squircle } from "../../src/react/index.js";

function Beispiele() {
  const [alsLink, setzeAlsLink] = useState(false);
  return (
    <main>
      <header>
        <div>
          <h1>squircles mit React</h1>
          <p>Native Elemente mit geglätteten Ecken. Die Gestaltung bleibt im CSS.</p>
        </div>
        <nav aria-label="Beispiele"><a href="/">Zur Spielwiese</a><a href="/svelte/">Svelte</a></nav>
      </header>

      <section className="beispiele" aria-labelledby="schaltflaechen">
        <h2 id="schaltflaechen">Schaltflächen und Links</h2>
        <div className="reihe">
          <Squircle as="button" type="button" className="taste">Mehr erfahren</Squircle>
          <Squircle as="a" href="#elementwechsel" className="taste taste--hell">Zu den Beispielen</Squircle>
        </div>
        <p className="hinweis">Hover, Fokusmarkierung und Hintergrund werden wie gewohnt per CSS gestaltet.</p>
      </section>

      <section className="beispiele" aria-labelledby="weitere-elemente">
        <h2 id="weitere-elemente">Karte, Bild und Eingabe</h2>
        <div className="reihe">
          <Squircle as="article" className="karte">
            <Squircle as="img" className="kartenbild" src="/examples/formen.svg" alt="Zwei geglättete Formen in Grautönen" />
            <div className="kartentext"><b>Eine Karte, weichere Ecken.</b><span>Hintergrund, Kontur und Schatten bleiben im CSS.</span></div>
          </Squircle>
          <div className="stapel">
            <label className="feld"><span>Texteingabe</span><Squircle as="input" className="eingabe" defaultValue="Dein Text" /></label>
            <Squircle as="span" className="markierung">Ohne zusätzliche Hülle</Squircle>
          </div>
        </div>
      </section>

      <section className="beispiele" id="elementwechsel" aria-labelledby="wechsel">
        <h2 id="wechsel">Das Element wechseln</h2>
        <div className="reihe">
          <button className="taste taste--hell" type="button" onClick={() => setzeAlsLink(!alsLink)}>Element wechseln</button>
          {alsLink
            ? <Squircle as="a" href="#wechsel" className="taste" data-wechsel>Jetzt ein Link</Squircle>
            : <Squircle as="button" type="button" className="taste" data-wechsel>Jetzt eine Schaltfläche</Squircle>}
        </div>
        <p className="hinweis">Die Form folgt dem neuen Element; alte Beobachter werden entfernt.</p>
      </section>
    </main>
  );
}

const container = document.getElementById("root");
if (container) createRoot(container).render(<StrictMode><Beispiele /></StrictMode>);
