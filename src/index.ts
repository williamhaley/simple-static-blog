import Generator from './generator';
import { log } from './util';
import chokidar from 'chokidar';

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

  generator.generateAllPages();
  generator.logDebugInfo();

  if (watchSource) {
    log.info('Watching for changes');

    // Initialize watcher.
    const watcher = chokidar.watch(sourceDirectory, {
      ignoreInitial: true, // Also of interest may be .on('ready')
      persistent: true
    });

    watcher.on('change', (path: string) => {
      console.log('change at:', path);
      generator.generateSinglePage(path);
    });
    watcher.on('unlinked', (path: string) => {
      console.log('removed at:', path);
      generator.generateSinglePage(path);
    });
    watcher.on('add', (path: string) => {
      console.log('add at:', path);
      generator.generateSinglePage(path);
    });
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

    process.on('SIGINT', function () {
      console.log('Stopping');

      process.exit();
    });
  }
}
