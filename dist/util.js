var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';
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
export const parseFrontMatterFile = (sourceFileAbsolutePath) => __awaiter(void 0, void 0, void 0, function* () {
    const readFile = util.promisify(fs.readFile);
    let frontMatterString = '';
    try {
        const frontMatterBuffer = yield readFile(sourceFileAbsolutePath);
        frontMatterString = frontMatterBuffer.toString('utf-8');
    }
    catch (err) {
        console.warn(err);
    }
    if (frontMatterString === '') {
        throw new Error(`error parsing :${sourceFileAbsolutePath}`);
    }
    const { data, content, errors } = frontmatter(frontMatterString);
    return {
        data,
        markdown: content,
        errors,
    };
});
//# sourceMappingURL=util.js.map