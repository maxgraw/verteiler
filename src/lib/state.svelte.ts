const STORAGE_KEY = "verteiler";

class VerteilerState {
  open = $state([true, false, false, false, false, false, false]);
  done = $state([false, false, false, false, false, false, false]);
  link = $state("");
  datum = $state("");
  uhrzeit = $state("");

  readonly tag = $derived(
    this.datum
      ? new Date(`${this.datum}T12:00`).toLocaleDateString("de-DE", {
          weekday: "long",
        })
      : "",
  );

  readonly formattedDatum = $derived(
    this.datum ? this.datum.split("-").reverse().join(".") : "",
  );

  readonly deadlineComplete = $derived(!!this.datum && !!this.uhrzeit);

  constructor() {
    if (typeof localStorage !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const { link, datum, uhrzeit, open, done } = JSON.parse(saved);
          if (link) this.link = link;
          if (datum) this.datum = datum;
          if (uhrzeit) this.uhrzeit = uhrzeit;
          if (open) this.open = open;
          if (done) this.done = done;
        }
      } catch {}
    }

    $effect.root(() => {
      $effect(() => {
        const { link, datum, uhrzeit, open, done } = this;
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ link, datum, uhrzeit, open, done }),
        );
      });
    });
  }

  /**
   * Opens the next step after step i completes.
   * @param i - Zero-based index of the completed step
   */
  openNext = (i: number) => {
    if (i + 1 < this.open.length) this.open[i + 1] = true;
  };

  /** Clears all inputs and resets the workflow to the beginning. */
  reset = () => {
    this.link = "";
    this.datum = "";
    this.uhrzeit = "";
    this.open = [true, false, false, false, false, false, false];
    this.done = [false, false, false, false, false, false, false];
  };
}

export const state = new VerteilerState();
