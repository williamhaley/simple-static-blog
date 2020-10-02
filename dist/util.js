import * as fs from 'fs';
import * as path from 'path';
const frontmatter = require('@github-docs/frontmatter');
export const walk = (root, func) => {
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
    warn: (msg) => {
        console.log('\x1b[33m', msg, '\x1b[0m');
    },
    debug: (msg) => {
        console.log('\x1b[36m%s\x1b[0m', msg, '\x1b[0m');
    },
    info: (msg) => {
        console.log('\x1b[32m', msg, '\x1b[0m');
    },
};
export const parseFrontMatterFile = (sourceFileAbsolutePath) => {
    const frontMatterString = fs.readFileSync(sourceFileAbsolutePath, 'utf-8');
    const { data, content, errors } = frontmatter(frontMatterString);
    return {
        data,
        markdown: content,
        errors,
    };
};
//# sourceMappingURL=util.js.map