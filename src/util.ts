import * as fs from 'fs';
import * as path from 'path';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const frontmatter = require('@github-docs/frontmatter');

export const walk = (root: string, func: (filePath: string) => void): void => {
  fs.readdirSync(root).forEach((filePath) => {
    const absolute = path.join(root, filePath);

    func(absolute);

    const stat = fs.lstatSync(absolute);
    if (stat.isDirectory()) {
      walk(path.join(root, filePath), func);
    }
  });
};

export const log = {
  warn: (msg: string): void => {
    console.log('\x1b[33m', msg, '\x1b[0m');
  },
  debug: (msg: string): void => {
    console.log('\x1b[36m%s\x1b[0m', msg, '\x1b[0m');
  },
  info: (msg: string): void => {
    console.log('\x1b[32m', msg, '\x1b[0m');
  },
};

export const parseFrontMatterFile = (sourceFileAbsolutePath: string): any => {
  const frontMatterString = fs.readFileSync(sourceFileAbsolutePath, 'utf-8');

  const { data, content, errors } = frontmatter(frontMatterString);

  return {
    data,
    markdown: content,
    errors,
  };
};
