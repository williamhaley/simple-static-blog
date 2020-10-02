import * as fs from 'fs';
import Generator from './generator';
import { log } from './util';

export default function (
  sourceDirectory: string,
  destinationDirectory: string,
  templatesDirectory: string,
  title: string,
  rootURL: string,
  watchSource?: boolean,
): void {
  const generator = new Generator(
    sourceDirectory,
    destinationDirectory,
    templatesDirectory,
    title,
    rootURL,
  );

  log.info('Starting');

  generator.generatePages();
  generator.generateSiteMap();
  generator.generateIndexXml();
  generator.generateBlogXml();

  generator.logDebugInfo();

  if (watchSource) {
    log.info('Watching for changes');

    fs.watch(
      sourceDirectory,
      {
        persistent: true,
        recursive: true,
      },
      (eventType: string, filePath: string) => {
        console.log(`change: ${eventType} ${filePath}`);
        // const sourceFileAbsolutePath = path.join(sourceDirectory, filePath);
        // log.info(`file changed (${eventType}) "${sourceFileAbsolutePath}"`);
        // const data = processSourceFile(
        //   sourceFileAbsolutePath,
        //   temporaryDirectory,
        //   destinationDirectory,
        // );
        // if (!data) {
        //   return;
        // }
        // if (data.template === 'post') {
        //   // Date:Slug to enforce uniqueness for posts on a given date.
        //   // toISOString() is crucial for proper date sorting.
        //   const key = `${(data.lastmod
        //     ? data.lastmod
        //     : data.date
        //   ).toISOString()}:${data.slug}`;
        //   sortedPosts = [...sortedPosts, key];
        //   posts.set(key, data);
        // }
        // sortedPosts = sortedPosts.sort().reverse();
        // generator.generateIndex(sortedPosts, posts);
      },
    );

    process.on('SIGINT', function () {
      console.log('Stopping');

      process.exit();
    });
  }
}
