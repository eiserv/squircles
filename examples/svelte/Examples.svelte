<script>
  import { squircle } from "../../src/svelte/index.js";
  import { applySquircle } from "../../src/dom/index.js";

  let smoothing = 1;
  let visible = true;
</script>

<main>
  <header>
    <div>
      <h1>squircles with Svelte</h1>
      <p>CSS-driven shapes as actions or attachments. No extra wrapper.</p>
    </div>
    <nav aria-label="Examples"><a href="/">Back to playground</a><a href="/react/">React</a></nav>
  </header>

  <section class="examples" aria-labelledby="action-title">
    <h2 id="action-title">An action with reactive options</h2>
    <label class="stack">
      <span>Smoothing: {smoothing.toLocaleString("en-US")}</span>
      <input aria-label="Smoothing" type="range" min="0" max="1" step="0.05" bind:value={smoothing} />
    </label>
    <div class="row" style="margin-top: 24px">
      {#if visible}
        <button type="button" class="button" data-action use:squircle={{ smoothing }}>Learn more</button>
      {/if}
      <button type="button" class="button button--light" onclick={() => visible = !visible}>
        {visible ? "Remove example" : "Show example"}
      </button>
    </div>
    <p class="note">New options update the shape. Removing the element cleans up all observers.</p>
  </section>

  <section class="examples" aria-labelledby="attachment-title">
    <h2 id="attachment-title">As an attachment in Svelte 5.29+</h2>
    <button type="button" class="button" data-attachment {@attach (element) => applySquircle(element)}>
      Directly on the element
    </button>
    <p class="note">The DOM function already returns the required cleanup function.</p>
  </section>
</main>
