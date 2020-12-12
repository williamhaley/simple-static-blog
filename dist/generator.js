import * as fs from 'fs';
import * as path from 'path';
import * as url from 'url';
import { StandardFrontMatterKeys } from './types';
import { walk, log, parseFrontMatterFile } from './util';
import Handlebars from 'handlebars';
const marked = require('marked');
class Generator {
    constructor(srcDir, outDir, tmplDir, title, rootURL) {
        this.sourceDirectory = srcDir;
        this.outputDirectory = outDir;
        this.templateDirectory = tmplDir;
        this.title = title;
        this.rootURL = rootURL;
        this.uniqueFrontMatterKeys = new Set();
        this.loadHelpers();
        this.loadTemplates();
        this.loadAllFrontMatterFiles();
    }
    loadHelpers() {
        const helpersFile = require(path.join(this.templateDirectory, 'helpers'));
        Object.keys(helpersFile.default).forEach((helperName) => {
            Handlebars.registerHelper(helperName, helpersFile.default[helperName]);
        });
    }
    loadTemplates() {
        const templates = new Map();
        fs.readdirSync(this.templateDirectory).forEach((templateFile) => {
            if (templateFile.endsWith('.partial.html')) {
                const tmpl = fs.readFileSync(path.join(this.templateDirectory, templateFile), 'utf-8');
                const name = path.basename(templateFile, '.partial.html');
                Handlebars.registerPartial(name, tmpl);
            }
            else if (templateFile.endsWith('.html')) {
                const tmpl = fs.readFileSync(path.join(this.templateDirectory, templateFile), 'utf-8');
                const name = path.basename(templateFile, '.html');
                templates.set(name, Handlebars.compile(tmpl));
            }
        });
        this.templates = templates;
    }
    generateAllPages() {
        for (const key of this.pageKeysByURLAscending) {
            this.generatePage(this.frontMatterData.get(key));
        }
        this.generateSiteMap();
        this.generateIndexXml();
        this.generateBlogXml();
    }
    generateSinglePage(sourceFileAbsolutePath) {
        const [postPoperties, isPost] = this.loadSingleFrontMatterFile(sourceFileAbsolutePath);
        if (!postPoperties) {
            return;
        }
        this.generatePage(postPoperties);
    }
    generatePage(page) {
        const fileDirectory = path.join(this.outputDirectory, page.relativePath);
        log.info(`writing to "${fileDirectory}`);
        try {
            fs.mkdirSync(fileDirectory, { recursive: true });
        }
        catch (error) {
            if (error.code != 'EEXIST') {
                throw error;
            }
        }
        const output = this.renderPage(page.template, page);
        fs.writeFileSync(`${fileDirectory}/index.html`, output);
        if (page.aliases) {
            page.aliases.forEach((from) => {
                log.info(`generating alias from "${from}" to "${page.canonicalURL}"`);
                this.generateRedirect(from, page.canonicalURL);
            });
        }
    }
    logDebugInfo() {
        const allFrontMatterKeys = [...this.uniqueFrontMatterKeys.values()];
        const nonStandardKeys = allFrontMatterKeys.filter((key) => {
            return !StandardFrontMatterKeys.includes(key);
        });
        const standardKeys = allFrontMatterKeys.filter((key) => {
            return StandardFrontMatterKeys.includes(key);
        });
        console.log(`all front matter keys used: ${allFrontMatterKeys}`);
        console.log(`non-standard keys: ${nonStandardKeys}`);
        console.log(`standard keys: ${standardKeys}`);
    }
    loadAllFrontMatterFiles() {
        this.frontMatterData = new Map();
        let sourceFileAbsolutePaths = new Array();
        walk(this.sourceDirectory, (filePath) => {
            if (['.markdown', '.md'].includes(path.extname(filePath))) {
                sourceFileAbsolutePaths = [...sourceFileAbsolutePaths, filePath];
            }
        });
        let posts = new Array();
        for (const sourceFileAbsolutePath of sourceFileAbsolutePaths) {
            const [postPoperties, isPost] = this.loadSingleFrontMatterFile(sourceFileAbsolutePath);
            if (!postPoperties) {
                continue;
            }
            if (isPost) {
                posts = [...posts, postPoperties];
            }
        }
        this.updateIndexes(posts);
    }
    loadSingleFrontMatterFile(sourceFileAbsolutePath) {
        log.info(`processing "${sourceFileAbsolutePath}"`);
        const { data, markdown, errors } = parseFrontMatterFile(sourceFileAbsolutePath);
        if (errors.length > 0) {
            log.info(`error loading "${sourceFileAbsolutePath}`);
            return [null, false];
        }
        Object.keys(data).forEach((key) => {
            this.uniqueFrontMatterKeys.add(key);
        });
        if (!data) {
            log.warn(`no data for "${sourceFileAbsolutePath}`);
            return [null, false];
            return;
        }
        if (data.published === false) {
            log.info(`not published: "${sourceFileAbsolutePath}`);
            return [null, false];
            return;
        }
        const name = path.basename(sourceFileAbsolutePath, path.extname(sourceFileAbsolutePath));
        const isIndex = name === 'index';
        const slug = data.slug || (isIndex ? '' : name);
        const tmpl = data.template || 'post';
        const relativePath = path.join(tmpl === 'post' ? 'blog' : '', slug, '/');
        const canonicalURL = url.resolve(this.rootURL, relativePath);
        const postPoperties = Object.assign(Object.assign({}, data), { relativePath,
            slug, template: tmpl, latestDate: data.lastmod || data.date, canonicalURL });
        postPoperties.body = this.renderPost(markdown, postPoperties);
        this.frontMatterData.set(postPoperties.canonicalURL, postPoperties);
        return [postPoperties, tmpl === 'post'];
    }
    updateIndexes(posts) {
        const canonicalURLSortAscending = (a, b) => {
            return a.canonicalURL > b.canonicalURL ? 1 : -1;
        };
        const canonicalURLSortDescending = (a, b) => {
            return a.canonicalURL > b.canonicalURL ? -1 : 1;
        };
        const originalPublishSort = (a, b) => {
            const dateDiff = b.date.getTime() - a.date.getTime();
            if (dateDiff === 0) {
                return canonicalURLSortDescending(a, b);
            }
            return dateDiff;
        };
        const lastModifiedSort = (a, b) => {
            const dateDiff = b.latestDate.getTime() - a.latestDate.getTime();
            if (dateDiff === 0) {
                return canonicalURLSortDescending(a, b);
            }
            return dateDiff;
        };
        const frontMatterArray = [...this.frontMatterData.values()];
        this.pageKeysByURLAscending = frontMatterArray
            .sort(canonicalURLSortAscending)
            .map((p) => p.canonicalURL);
        this.pageKeysByPublishDate = frontMatterArray
            .sort(originalPublishSort)
            .map((p) => p.canonicalURL);
        this.postKeysByPublishDate = posts
            .sort(originalPublishSort)
            .map((p) => p.canonicalURL);
        this.postKeysByLatestDate = posts
            .sort(lastModifiedSort)
            .map((p) => p.canonicalURL);
    }
    generateXml(name, data, outputPath) {
        const output = this.renderPage(name, {
            data,
        });
        log.info(`writing ${name} "${outputPath}`);
        fs.writeFileSync(`${outputPath}`, output);
    }
    generateSiteMap() {
        this.generateXml('sitemap.xml', this.pageKeysByURLAscending.map((key) => this.frontMatterData.get(key)), `${this.outputDirectory}/sitemap.xml`);
    }
    generateIndexXml() {
        this.generateXml('index.xml', this.pageKeysByPublishDate.map((key) => this.frontMatterData.get(key)), `${this.outputDirectory}/index.xml`);
    }
    generateBlogXml() {
        this.generateXml('blog.index', this.postKeysByPublishDate.map((key) => this.frontMatterData.get(key)), `${this.outputDirectory}/blog/index.xml`);
    }
    generateRedirect(from, canonicalURL) {
        const aliasDirectory = path.join(this.outputDirectory, from);
        log.info(`writing redirect for "${from}`);
        try {
            fs.mkdirSync(aliasDirectory, { recursive: true });
        }
        catch (error) {
            if (error.code != 'EEXIST') {
                throw error;
            }
        }
        const redirectHtml = `<!DOCTYPE html><html><head><title>${canonicalURL}</title><link rel="canonical" href="${canonicalURL}"/><meta name="robots" content="noindex"><meta charset="utf-8" /><meta http-equiv="refresh" content="0; url=${canonicalURL}" /></head></html>`;
        fs.writeFileSync(`${aliasDirectory}/index.html`, redirectHtml);
    }
    renderPage(templateName, templateData) {
        return this.templates.get(templateName)(Object.assign(Object.assign({}, templateData), { posts: this.postKeysByLatestDate.map((key) => this.frontMatterData.get(key)), site: {
                rootURL: this.rootURL,
                title: this.title,
                sourceDirectory: this.sourceDirectory,
            } }));
    }
    renderPost(templateString, templateData) {
        const withHandlebars = Handlebars.compile(templateString)(Object.assign(Object.assign({}, templateData), { site: {
                rootURL: this.rootURL,
                title: this.title,
                sourceDirectory: this.sourceDirectory,
            } }));
        return marked(withHandlebars).toString();
    }
}
export default Generator;
//# sourceMappingURL=generator.js.map