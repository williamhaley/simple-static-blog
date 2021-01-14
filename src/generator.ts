import * as fs from 'fs';
import * as path from 'path';
import * as url from 'url';
import { StandardFrontMatterKeys, PostProperties } from './types';
import { walk, log, parseFrontMatterFile } from './util';
import Handlebars from 'handlebars';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const marked = require('marked');

class Generator {
  private sourceDirectory: string;
  private outputDirectory: string;
  private templateDirectory: string;

  private title: string;
  private rootURL: string;

  private templates: Map<string, HandlebarsTemplateDelegate>;
  private frontMatterData: Map<string, PostProperties>;
  private uniqueFrontMatterKeys: Set<string>;

  private postKeysByPublishDate: Array<string>;
  private postKeysByLatestDate: Array<string>;
  private pageKeysByURLAscending: Array<string>;
  private pageKeysByPublishDate: Array<string>;

  constructor(
    srcDir: string,
    outDir: string,
    tmplDir: string,
    title: string,
    rootURL: string,
  ) {
    this.sourceDirectory = srcDir;
    this.outputDirectory = outDir;
    this.templateDirectory = tmplDir;

    this.title = title;
    this.rootURL = rootURL;

    this.uniqueFrontMatterKeys = new Set<string>();
  }

  async load() {
    this.loadHelpers();
    this.loadTemplates();
    await this.loadAllFrontMatterFiles();
  }

  private loadHelpers(): void {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const helpersFile = require(path.join(this.templateDirectory, 'helpers'));
    Object.keys(helpersFile.default).forEach((helperName) => {
      Handlebars.registerHelper(helperName, helpersFile.default[helperName]);
    });
  }

  private loadTemplates(): void {
    const templates = new Map<string, HandlebarsTemplateDelegate>();

    fs.readdirSync(this.templateDirectory).forEach((templateFile: string) => {
      if (templateFile.endsWith('.partial.html')) {
        const tmpl = fs.readFileSync(
          path.join(this.templateDirectory, templateFile),
          'utf-8',
        );
        const name = path.basename(templateFile, '.partial.html');
        Handlebars.registerPartial(name, tmpl);
      } else if (templateFile.endsWith('.html')) {
        const tmpl = fs.readFileSync(
          path.join(this.templateDirectory, templateFile),
          'utf-8',
        );
        const name = path.basename(templateFile, '.html');
        templates.set(name, Handlebars.compile(tmpl));
      }
    });

    this.templates = templates;
  }

  generateAllPages(): void {
    for (const key of this.pageKeysByURLAscending) {
      this.generatePage(this.frontMatterData.get(key));
    }

    this.generateSiteMap();
    this.generateIndexXml();
    this.generateBlogXml();
  }

  async generateSinglePage(sourceFileAbsolutePath: string): Promise<void> {
    const [postProperties, isPost] = await this.loadSingleFrontMatterFile(sourceFileAbsolutePath);

    if (!postProperties) {
      return;
    }

    this.generatePage(postProperties);
  }

  private generatePage(page: PostProperties): void {
    const fileDirectory = path.join(this.outputDirectory, page.relativePath);
    log.info(`writing to "${fileDirectory}`);
    try {
      fs.mkdirSync(fileDirectory, { recursive: true });
    } catch (error) {
      if (error.code != 'EEXIST') {
        throw error;
      }
    }

    const output = this.renderPage(page.template, page);

    // Every "page" is represented by a directory with a single index.html file.
    fs.writeFileSync(`${fileDirectory}/index.html`, output);

    if (page.aliases) {
      page.aliases.forEach((from: string) => {
        log.info(`generating alias from "${from}" to "${page.canonicalURL}"`);
        this.generateRedirect(from, page.canonicalURL);
      });
    }
  }

  logDebugInfo(): void {
    const allFrontMatterKeys = [...this.uniqueFrontMatterKeys.values()];
    const nonStandardKeys = allFrontMatterKeys.filter((key: string) => {
      return !StandardFrontMatterKeys.includes(key);
    });
    const standardKeys = allFrontMatterKeys.filter((key: string) => {
      return StandardFrontMatterKeys.includes(key);
    });
    console.log(`all front matter keys used: ${allFrontMatterKeys}`);
    console.log(`non-standard keys: ${nonStandardKeys}`);
    console.log(`standard keys: ${standardKeys}`);
  }

  private async loadAllFrontMatterFiles(): Promise<void> {
    this.frontMatterData = new Map<string, PostProperties>();

    let sourceFileAbsolutePaths = new Array<string>();

    walk(this.sourceDirectory, (filePath: string) => {
      if (['.markdown', '.md'].includes(path.extname(filePath))) {
        sourceFileAbsolutePaths = [...sourceFileAbsolutePaths, filePath];
      }
    });

    let posts = new Array<PostProperties>();

    for (const sourceFileAbsolutePath of sourceFileAbsolutePaths) {
      const [postPoperties, isPost] = await this.loadSingleFrontMatterFile(sourceFileAbsolutePath);
      if (!postPoperties) {
        continue;
      }

      if (isPost) {
        posts = [...posts, postPoperties];
      }
    }

    this.updateIndexes(posts);
  }

  private async loadSingleFrontMatterFile(sourceFileAbsolutePath: string): Promise<[PostProperties, boolean]> {
    log.info(`processing "${sourceFileAbsolutePath}"`);

    const { data, markdown, errors } = await parseFrontMatterFile(
      sourceFileAbsolutePath,
    );
    if (errors.length > 0) {
      // TODO WFH
      log.info(`error loading "${sourceFileAbsolutePath}`);
      return [null, false];
    }

    if (Object.keys(data).length === 0) {
      log.warn(`no data for "${sourceFileAbsolutePath}`);
      return [null, false];
    }

    Object.keys(data).forEach((key: string) => {
      this.uniqueFrontMatterKeys.add(key);
    });

    if (data.published === false) {
      log.info(`not published: "${sourceFileAbsolutePath}`);
      return [null, false];
    }

    // TODO WFH Don't hack at the original front matter. Make it clear it's being
    // extended.
    const name = path.basename(
      sourceFileAbsolutePath,
      path.extname(sourceFileAbsolutePath),
    );
    const isIndex = name === 'index';
    const slug = data.slug || (isIndex ? '' : name);
    const tmpl = data.template || 'post';
    const relativePath = path.join(tmpl === 'post' ? 'blog' : '', slug, '/');
    const canonicalURL = url.resolve(this.rootURL, relativePath);

    // Normalized data.
    // TODO WFH Some of these could be functions, or helpers.
    const postPoperties = {
      ...data,
      relativePath,
      slug,
      template: tmpl,
      latestDate: data.lastmod || data.date,
      canonicalURL,
    } as PostProperties;

    postPoperties.body = this.renderPost(markdown, postPoperties);

    // TODO WFH Side effect...
    this.frontMatterData.set(postPoperties.canonicalURL, postPoperties);

    return [postPoperties, tmpl === 'post'];
  }

  private updateIndexes(posts: Array<PostProperties>): void {
    const canonicalURLSortAscending = (
      a: PostProperties,
      b: PostProperties,
    ) => {
      return a.canonicalURL > b.canonicalURL ? 1 : -1;
    };
    const canonicalURLSortDescending = (
      a: PostProperties,
      b: PostProperties,
    ) => {
      return a.canonicalURL > b.canonicalURL ? -1 : 1;
    };
    const originalPublishSort = (a: PostProperties, b: PostProperties) => {
      const dateDiff = b.date.getTime() - a.date.getTime();

      if (dateDiff === 0) {
        return canonicalURLSortDescending(a, b);
      }

      return dateDiff;
    };
    const lastModifiedSort = (a: PostProperties, b: PostProperties) => {
      const dateDiff = b.latestDate.getTime() - a.latestDate.getTime();

      if (dateDiff === 0) {
        return canonicalURLSortDescending(a, b);
      }

      return dateDiff;
    };

    // sort() is in-place, but these all return maps so doesn't matter if we
    // re-sort the same source data.
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

  generateXml(
    name: string,
    data: Array<PostProperties>,
    outputPath: string,
  ): void {
    const output = this.renderPage(name, {
      data,
    });

    log.info(`writing ${name} "${outputPath}`);
    fs.writeFileSync(`${outputPath}`, output);
  }

  generateSiteMap(): void {
    this.generateXml(
      'sitemap.xml',
      this.pageKeysByURLAscending.map((key) => this.frontMatterData.get(key)),
      `${this.outputDirectory}/sitemap.xml`,
    );
  }

  generateIndexXml(): void {
    this.generateXml(
      'index.xml',
      this.pageKeysByPublishDate.map((key) => this.frontMatterData.get(key)),
      `${this.outputDirectory}/index.xml`,
    );
  }

  generateBlogXml(): void {
    this.generateXml(
      'blog.index',
      this.postKeysByPublishDate.map((key) => this.frontMatterData.get(key)),
      `${this.outputDirectory}/blog/index.xml`,
    );
  }

  generateRedirect(from: string, canonicalURL: string): void {
    const aliasDirectory = path.join(this.outputDirectory, from);

    log.info(`writing redirect for "${from}`);
    try {
      fs.mkdirSync(aliasDirectory, { recursive: true });
    } catch (error) {
      if (error.code != 'EEXIST') {
        throw error;
      }
    }

    const redirectHtml = `<!DOCTYPE html><html><head><title>${canonicalURL}</title><link rel="canonical" href="${canonicalURL}"/><meta name="robots" content="noindex"><meta charset="utf-8" /><meta http-equiv="refresh" content="0; url=${canonicalURL}" /></head></html>`;

    fs.writeFileSync(`${aliasDirectory}/index.html`, redirectHtml);
  }

  private renderPage(templateName: string, templateData: any): string {
    return this.templates.get(templateName)({
      ...templateData,
      posts: this.postKeysByLatestDate.map((key) =>
        this.frontMatterData.get(key),
      ),
      site: {
        rootURL: this.rootURL,
        title: this.title,
        sourceDirectory: this.sourceDirectory,
      },
    });
  }

  private renderPost(templateString: string, templateData: any): string {
    const withHandlebars = Handlebars.compile(templateString)({
      ...templateData,
      site: {
        rootURL: this.rootURL,
        title: this.title,
        sourceDirectory: this.sourceDirectory,
      },
    });

    return marked(withHandlebars).toString();
  }
}

export default Generator;
