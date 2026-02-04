export interface CrudTableIconDefinition {
  viewBox: string;
  paths: string[];
}

const circlePath = (cx: number, cy: number, r: number) =>
  [
    `M ${cx - r} ${cy}`,
    `a ${r} ${r} 0 1 0 ${2 * r} 0`,
    `a ${r} ${r} 0 1 0 -${2 * r} 0`,
  ].join(' ');

export const CRUD_TABLE_ICON_ALIASES: Record<string, string> = {
  add: 'plus',
  delete: 'trash',
};

export const CRUD_TABLE_ICON_LIBRARY: Record<string, CrudTableIconDefinition> = {
  view: {
    viewBox: '0 0 24 24',
    paths: [
      'M2 12s3.8-6.5 10-6.5S22 12 22 12s-3.8 6.5-10 6.5S2 12 2 12Z',
      circlePath(12, 12, 3.2),
    ],
  },
  study: {
    viewBox: '0 0 24 24',
    paths: [
      'M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5V5.5Z',
      'M4 20.5V7.5A2.5 2.5 0 0 1 6.5 5H20',
    ],
  },
  edit: {
    viewBox: '0 0 24 24',
    paths: [
      'M3 17.25V21h3.75L17.8 9.94l-3.75-3.75L3 17.25Z',
      'M14.06 6.19 16.3 3.94a1.33 1.33 0 0 1 1.88 0l1.88 1.88a1.33 1.33 0 0 1 0 1.88L17.8 9.94',
    ],
  },
  trash: {
    viewBox: '0 0 24 24',
    paths: [
      'M4 7h16',
      'M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2',
      'M6 7l1 13h10l1-13',
      'M10 11v6',
      'M14 11v6',
    ],
  },
  plus: {
    viewBox: '0 0 24 24',
    paths: ['M12 5v14', 'M5 12h14'],
  },
};
