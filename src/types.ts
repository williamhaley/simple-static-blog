export interface PostProperties {
  // Standard fields.
  title: string;
  date?: Date;
  lastmod?: Date;
  template: 'toplevel' | 'post' | 'list';
  slug?: string;
  aliases?: Array<string>;
  published: boolean;

  // My non-standard fields.
  disqus: boolean;
  archived: boolean;
  firebase: boolean;

  // Derived fields.
  latestDate: Date;
  body: string;
  relativePath: string;
  canonicalURL: string;
}

export const StandardFrontMatterKeys = [
  'title',
  'date',
  'lastmod',
  'template',
  'slug',
  'aliases',
  'published',
];
