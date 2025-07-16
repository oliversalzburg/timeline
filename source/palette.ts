import { mustExist } from "@oliversalzburg/js-utils/data/nil.js";
import { hsl2rgb, rgb2hsl } from "@oliversalzburg/js-utils/graphics/color.js";
import { hslPalette } from "@oliversalzburg/js-utils/graphics/palette.js";
import { TRANSPARENT } from "./constants.js";
import type { RenderMode, RGBATuple, RGBTuple } from "./types.js";

export interface PaletteEntry {
  fill: string;
  font: string;
  pen: string;
  source: string | undefined;
}

export const rgbaToString = (rgba: RGBATuple): string =>
  `#${rgba
    .map(_ => _.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;

export const fillColorForPen = (color: RGBTuple | RGBATuple, theme: RenderMode): string => {
  const hsl = rgb2hsl(color[0] / 255, color[1] / 255, color[2] / 255);
  const rgb = hsl2rgb(hsl[0], hsl[1], hsl[2] * (theme === "light" ? 2 : 0.5));
  return rgbaToString([
    Math.trunc(rgb[0] * 255),
    Math.trunc(rgb[1] * 255),
    Math.trunc(rgb[2] * 255),
    255,
  ]);
};
export const matchFontColorTo = (color: RGBTuple | RGBATuple): string => {
  const hsl = rgb2hsl(color[0] / 255, color[1] / 255, color[2] / 255);
  return hsl[2] < 180 ? "#FFFFFFFF" : "#000000FF";
};

export const palette = <T>(theme: RenderMode) => {
  // The registered items.
  const entries = new Map<T, string | undefined>();
  // User-defined, named colors.
  const colorReferences = new Map<string, Set<T>>();
  const baseColorValues = new Map<T, RGBATuple | undefined>();

  const add = (item: T, color?: string) => {
    entries.set(item, color);
    // If the timeline uses a named color, register that named color.
    if (color !== undefined && color !== TRANSPARENT && !color.startsWith("#")) {
      if (!colorReferences.has(color)) {
        colorReferences.set(color, new Set<T>());
      }
      const referenceSet = mustExist(colorReferences.get(color));
      referenceSet.add(item);
    }
    if (color === undefined) {
      baseColorValues.set(item, undefined);
    }
    if (color === TRANSPARENT) {
      baseColorValues.set(item, [0, 0, 0, 0]);
    }
    if (color?.startsWith("#")) {
      const components = mustExist(color.substring(1).match(/../g)).map(x =>
        Number.parseInt(x, 16),
      );
      if (components.length === 3) {
        baseColorValues.set(item, [...(components as RGBTuple), 255]);
      } else if (components.length === 4) {
        baseColorValues.set(item, components as RGBATuple);
      } else {
        baseColorValues.set(item, undefined);
      }
    }
  };

  const predictDemand = () => {
    const requiredToFillReferences = colorReferences.size;
    const requiredToFillUndefined = [...entries.values().filter(_ => _ === undefined)].length;
    return requiredToFillReferences + requiredToFillUndefined;
  };

  const toPalette = () => {
    const demand = predictDemand();
    const extraColorValues = hslPalette(demand, 0, 0.4, 0.5);
    const assignments = new Map<string, Array<T>>();
    for (const [colorName, references] of colorReferences) {
      const color = mustExist(extraColorValues.pop());
      assignments.set(colorName, [...references]);
      for (const timeline of references) {
        baseColorValues.set(timeline, [...color, 255]);
      }
    }

    const transparents = [
      ...entries
        .entries()
        .filter(([, color]) => color === TRANSPARENT)
        .map(([timeline]) => timeline),
    ];
    for (const [timeline, color] of baseColorValues) {
      if (transparents.includes(timeline)) {
        continue;
      }

      if (color === undefined) {
        const color = mustExist(extraColorValues.pop());
        baseColorValues.set(timeline, [...color, 255]);
        assignments.set(rgbaToString([...color, 255]), [timeline]);
        continue;
      }

      assignments.set(rgbaToString([...color]), [timeline]);
    }

    if (0 < transparents.length) {
      assignments.set(TRANSPARENT, transparents);
    }
    return {
      assignments,
      lookup: new Map<T, PaletteEntry>(
        entries.entries().map(([_, color]) => [
          _,
          color === TRANSPARENT
            ? {
                fill: "transparent",
                font: matchFontColorTo(theme === "light" ? [255, 255, 255] : [0, 0, 0]),
                pen: "transparent",
                source: color,
              }
            : {
                fill: fillColorForPen(mustExist(baseColorValues.get(_)), theme),
                font: matchFontColorTo(mustExist(baseColorValues.get(_))),
                pen: rgbaToString(mustExist(baseColorValues.get(_))),
                source: color,
              },
        ]),
      ),
    };
  };

  return { add, predictDemand, toPalette };
};

export const matchLuminance = (toAdjust: string, target: string): string => {
  if (toAdjust === target) {
    return toAdjust;
  }

  const componentsBase = mustExist(toAdjust.substring(1).match(/../g)).map(x =>
    Number.parseInt(x, 16),
  );
  const componentsTarget = mustExist(target.substring(1).match(/../g)).map(x =>
    Number.parseInt(x, 16),
  );
  const hslBase = rgb2hsl(
    componentsBase[0] / 255,
    componentsBase[1] / 255,
    componentsBase[2] / 255,
  );
  const hslTarget = rgb2hsl(
    componentsTarget[0] / 255,
    componentsTarget[1] / 255,
    componentsTarget[2] / 255,
  );

  return rgbaToString([
    ...(hsl2rgb(hslBase[0], hslBase[1], hslTarget[2]).map(x => Math.floor(x * 255)) as RGBTuple),
    255,
  ]);
};
