"use client";

import { useState } from "react";

export function HudHelp() {
  const [help, setHelp] = useState(false);
  return (
    <section className="panel help">
      <button className="help-toggle" onClick={() => setHelp((h) => !h)}>
        {help ? "Hide" : "Controls"}
      </button>
      {help ? (
        <ul>
          <li><kbd>WASD</kbd> move · <kbd>Shift</kbd> sprint · <kbd>Space</kbd> jump / handbrake</li>
          <li><kbd>F</kbd> enter / exit nearby vehicle · <kbd>E</kbd> sit / interact</li>
          <li><kbd>Q</kbd> / <kbd>.</kbd> indicators · <kbd>H</kbd> horn</li>
          <li>Hold <kbd>Tab</kbd> emotes · <kbd>R</kbd>/<kbd>G</kbd> fight</li>
          <li><kbd>M</kbd> mic · <kbd>N</kbd> map · <kbd>T</kbd> time · <kbd>J</kbd> weather</li>
        </ul>
      ) : null}
    </section>
  );
}
