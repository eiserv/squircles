<script>
  import { squircle } from "../../src/svelte/index.js";
  import { applySquircle } from "../../src/dom/index.js";

  let glaettung = 1;
  let sichtbar = true;
</script>

<main>
  <header>
    <div>
      <h1>squircles mit Svelte</h1>
      <p>CSS-basierte Formen als Action oder Attachment. Ohne zusätzliche Hülle.</p>
    </div>
    <nav aria-label="Beispiele"><a href="/">Zur Spielwiese</a><a href="/react/">React</a></nav>
  </header>

  <section class="beispiele" aria-labelledby="action-titel">
    <h2 id="action-titel">Eine Action mit reaktiven Optionen</h2>
    <label class="stapel">
      <span>Glättung: {glaettung.toLocaleString("de-DE")}</span>
      <input aria-label="Glättung" type="range" min="0" max="1" step="0.05" bind:value={glaettung} />
    </label>
    <div class="reihe" style="margin-top: 24px">
      {#if sichtbar}
        <button type="button" class="taste" data-action use:squircle={{ smoothing: glaettung }}>Mehr erfahren</button>
      {/if}
      <button type="button" class="taste taste--hell" onclick={() => sichtbar = !sichtbar}>
        {sichtbar ? "Beispiel entfernen" : "Beispiel anzeigen"}
      </button>
    </div>
    <p class="hinweis">Neue Optionen aktualisieren die Form. Beim Entfernen werden alle Beobachter aufgeräumt.</p>
  </section>

  <section class="beispiele" aria-labelledby="attachment-titel">
    <h2 id="attachment-titel">Als Attachment ab Svelte 5.29</h2>
    <button type="button" class="taste" data-attachment {@attach (element) => applySquircle(element)}>
      Direkt am Element
    </button>
    <p class="hinweis">Die DOM-Funktion liefert bereits die passende Aufräumfunktion zurück.</p>
  </section>
</main>
