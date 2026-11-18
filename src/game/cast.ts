import type { NamedPoint, Point } from '../engine/tiled';
import { type TextKey, textKey } from '../text/text';
import type { Dialogue, FigureState } from './state';

/**
 * The cast (world.md §3, feature 0017): the figures that can be spoken to and what they say.
 * Where a figure stands is a point of the map named `figure:<id>` (INV-7); who it is and its
 * pages are data here. Pure data and pure functions; the figures are read from the map's
 * points on every call and kept nowhere.
 */

/** A point whose name starts with this is where a figure stands; the rest of the name is its id. */
export const FIGURE_PREFIX = 'figure:';

export interface CastMember {
  /** Also the name of its sprite sheet, `<id>.png`. */
  readonly id: string;
  /** What it says, page by page; at least one. */
  readonly pages: readonly TextKey[];
}

export const CAST: readonly CastMember[] = [
  {
    id: 'officer',
    pages: [textKey('talk.officer-rules-1'), textKey('talk.officer-rules-2')],
  },
];

/**
 * The first meeting (world.md §3, feature 0026): while the player has no lamp, this figure says
 * these pages instead of its own, and the step that closes them hands the lamp over.
 */
export interface Meeting {
  /** The id of the figure in the cast. */
  readonly figure: string;
  readonly pages: readonly TextKey[];
}

export const FIRST_MEETING: Meeting = {
  figure: 'officer',
  pages: [textKey('talk.officer-rules-1'), textKey('talk.officer-meeting-2')],
};

/** The lines of a colleague who walks the floor (0018), by the name of its route. */
export interface Colleague {
  /** The route's name, `person:<room>`. */
  readonly route: string;
  /** What it says, page by page; at least one. */
  readonly pages: readonly TextKey[];
}

export const COLLEAGUES: readonly Colleague[] = [
  { route: 'person:reception', pages: [textKey('talk.reception-everyday')] },
  { route: 'person:marketing', pages: [textKey('talk.marketing-everyday')] },
  { route: 'person:support', pages: [textKey('talk.support-everyday')] },
  { route: 'person:sales', pages: [textKey('talk.sales-everyday')] },
];

/** The pages of the colleague on a route; none when the route has no lines. */
export function pagesOfRoute(
  route: string,
  colleagues: readonly Colleague[] = COLLEAGUES,
): readonly TextKey[] {
  return colleagues.find((colleague) => colleague.route === route)?.pages ?? [];
}

export function isFigurePoint(name: string): boolean {
  return name.startsWith(FIGURE_PREFIX);
}

/** A figure of the cast where the map puts it: the feet in map pixels. */
export interface Figure extends Point {
  readonly id: string;
  readonly pages: readonly TextKey[];
}

/**
 * The figures of a map, in the order of its points. Rejects an id the cast does not have and
 * a second point with the same id, so that a typing mistake in the map is not a silently
 * missing figure. A member of the cast without a point is simply not in this map.
 */
export function figuresOf(
  points: readonly NamedPoint[],
  cast: readonly CastMember[] = CAST,
): Figure[] {
  const figures: Figure[] = [];
  for (const point of points) {
    if (!isFigurePoint(point.name)) {
      continue;
    }
    const id = point.name.slice(FIGURE_PREFIX.length);
    const member = cast.find((candidate) => candidate.id === id);
    if (member === undefined) {
      throw new Error(`figure point ${point.name} names no figure`);
    }
    if (figures.some((figure) => figure.id === id)) {
      throw new Error(`more than one point object "${point.name}"`);
    }
    figures.push({ id, pages: member.pages, x: point.x, y: point.y });
  }
  return figures;
}

/** Every figure of the map looking down: the figures a game starts with. */
export function figuresFrom(figures: readonly Figure[]): FigureState[] {
  return figures.map((_figure, figure) => ({ figure, facing: 'down' }));
}

/**
 * The figures as they speak in a step (0026): while the lamp is not owned, the figure of the
 * first meeting has the meeting's pages; with the lamp owned every figure has its own.
 */
export function figuresIn(
  figures: readonly Figure[],
  lampOwned: boolean,
  meeting: Meeting = FIRST_MEETING,
): readonly Figure[] {
  if (lampOwned) {
    return figures;
  }
  return figures.map((figure) =>
    figure.id === meeting.figure ? { ...figure, pages: meeting.pages } : figure,
  );
}

/**
 * Whether the dialogue is the first meeting: the lamp is not owned, and the speaker is the
 * figure that hands it over. The step that closes such a dialogue gives the lamp.
 */
export function isFirstMeeting(
  dialogue: Dialogue,
  figures: readonly Figure[],
  lampOwned: boolean,
  meeting: Meeting = FIRST_MEETING,
): boolean {
  return (
    !lampOwned && dialogue.speaker === 'figure' && figures[dialogue.index]?.id === meeting.figure
  );
}
