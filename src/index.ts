import Generator from './generator';
import { log } from './util';
import chokidar from 'chokidar';
import server from './server';

export default async function (
  sourceDirectory: string,
  destinationDirectory: string,
  templatesDirectory: string,
  title: string,
  rootURL: string,
  watchSource?: boolean,
  serve?: boolean,
  port?: number,
  staticDirectory?: string,
) {
  const generator = new Generator(
    sourceDirectory,
    destinationDirectory,
    templatesDirectory,
    title,
    rootURL,
  );

  log.info('Starting');

  await generator.load();

  generator.generateAllPages();
  generator.logDebugInfo();

  if (serve) {
    server(destinationDirectory, port);
  }

  if (watchSource) {
    log.info('Watching for changes');

    const staticFileWatcher = chokidar.watch(staticDirectory, {
      ignoreInitial: true,
      persistent: true,
    });
    staticFileWatcher.on('change', async (path: string) => {
      console.log(`[static] change at: ${path}`);
    });
    staticFileWatcher.on('unlinked', async (path: string) => {
      console.log(`[static] removed at: ${path}`);
    });
    staticFileWatcher.on('add', async (path: string) => {
      console.log(`[static] add at: ${path}`);
    });

    // Initialize watcher.
    const watcher = chokidar.watch(sourceDirectory, {
      ignoreInitial: true, // Also of interest may be .on('ready')
      persistent: true
    });

    watcher.on('change', async (path: string) => {
      console.log('change at:', path);
      await generator.generateSinglePage(path);
    });
    watcher.on('unlinked', async (path: string) => {
      console.log('removed at:', path);
      await generator.generateSinglePage(path);
    });
    watcher.on('add', async (path: string) => {
      console.log('add at:', path);
      await generator.generateSinglePage(path);
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
