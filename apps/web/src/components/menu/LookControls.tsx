"use client";

/** Customize tabs: body / hair / outfit / extras. */
import {
  ACCESSORIES,
  BODY_NAMES,
  BOTTOM_COLORS,
  BOTTOM_NAMES,
  DEFAULT_LOOK,
  HAIR_COLORS,
  HAIR_NAMES,
  SHOE_COLORS,
  SHOE_NAMES,
  SKIN_TONES,
  TOP_COLORS,
  TOP_NAMES,
  randomLook,
  type Look,
} from "@/avatar/appearance";
import { useGame } from "@/game/store";

export const MENU_TABS = ["Body", "Hair", "Outfit", "Extras"] as const;
export type MenuTab = (typeof MENU_TABS)[number];

function Swatches({ colors, value, onPick }: { colors: readonly string[]; value: number; onPick: (i: number) => void }) {
  return (
    <div className="swatches">
      {colors.map((c, i) => (
        <button key={c} className={i === value ? "sw on" : "sw"} style={{ background: c }} onClick={() => onPick(i)} aria-label={`Color ${i + 1}`} />
      ))}
    </div>
  );
}

function Chips({ names, value, onPick }: { names: readonly string[]; value: number; onPick: (i: number) => void }) {
  return (
    <div className="chips">
      {names.map((n, i) => (
        <button key={n} className={i === value ? "chip on" : "chip"} onClick={() => onPick(i)}>
          {n}
        </button>
      ))}
    </div>
  );
}

type Props = {
  look: Look;
  tab: MenuTab;
  setTab: (t: MenuTab) => void;
  tweak: (patch: Partial<Look>) => void;
  onSurprise: () => void;
};

export function LookControls({ look, tab, setTab, tweak, onSurprise }: Props) {
  return (
    <section className="menu-right">
      <nav className="tabs" aria-label="Customize">
        {MENU_TABS.map((t) => (
          <button key={t} className={t === tab ? "tab on" : "tab"} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </nav>
      <div className="menu-pane">
        {tab === "Body" ? (
          <div className="group">
            <h3>Build</h3>
            <Chips names={BODY_NAMES} value={look.body} onPick={(i) => tweak({ body: i })} />
            <h3>Skin tone</h3>
            <Swatches colors={SKIN_TONES} value={look.skin} onPick={(i) => tweak({ skin: i })} />
          </div>
        ) : null}
        {tab === "Hair" ? (
          <div className="group">
            <h3>Style</h3>
            <Chips names={HAIR_NAMES} value={look.hair} onPick={(i) => tweak({ hair: i })} />
            <h3>Color</h3>
            <Swatches colors={HAIR_COLORS} value={look.hairColor} onPick={(i) => tweak({ hairColor: i })} />
          </div>
        ) : null}
        {tab === "Outfit" ? (
          <div className="group">
            <h3>Top</h3>
            <Chips names={TOP_NAMES} value={look.top} onPick={(i) => tweak({ top: i })} />
            <Swatches colors={TOP_COLORS} value={look.topColor} onPick={(i) => tweak({ topColor: i })} />
            <h3>Bottom</h3>
            <Chips names={BOTTOM_NAMES} value={look.bottom} onPick={(i) => tweak({ bottom: i })} />
            <Swatches colors={BOTTOM_COLORS} value={look.bottomColor} onPick={(i) => tweak({ bottomColor: i })} />
            <h3>Footwear</h3>
            <Chips names={SHOE_NAMES} value={look.shoe} onPick={(i) => tweak({ shoe: i })} />
            <Swatches colors={SHOE_COLORS} value={look.shoeColor} onPick={(i) => tweak({ shoeColor: i })} />
          </div>
        ) : null}
        {tab === "Extras" ? (
          <div className="group">
            <h3>Accessories</h3>
            <div className="chips">
              {ACCESSORIES.map((a) => (
                <button
                  key={a.bit}
                  className={look.acc & a.bit ? "chip on" : "chip"}
                  onClick={() => {
                    let next = look.acc ^ a.bit;
                    if (a.bit === 8 && next & 8) next &= ~256;
                    if (a.bit === 256 && next & 256) next &= ~8;
                    tweak({ acc: next });
                  }}
                >
                  {a.name}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
      <div className="menu-actions">
        <button
          className="ghost"
          onClick={() => {
            useGame.setState({ look: randomLook() });
            onSurprise();
          }}
        >
          Surprise me
        </button>
        <button className="ghost" onClick={() => useGame.setState({ look: DEFAULT_LOOK })}>
          Reset
        </button>
      </div>
    </section>
  );
}
