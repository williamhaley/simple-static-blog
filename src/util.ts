import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';

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

export const parseFrontMatterFile = async (sourceFileAbsolutePath: string): Promise<any> => {
  const readFile = util.promisify(fs.readFile);

  let frontMatterString = '';

  try {
    const frontMatterBuffer = await readFile(sourceFileAbsolutePath);
    frontMatterString = frontMatterBuffer.toString('utf-8');
  } catch (err) {
    console.warn(err);
  }

  if (frontMatterString === '') {
    console.warn(`empty front matter string for :${sourceFileAbsolutePath}`)
    throw new Error(`error parsing :${sourceFileAbsolutePath}`);
  }

  const { data, content, errors } = frontmatter(frontMatterString);

  return {
    data,
    markdown: content,
    errors,
  };
};
