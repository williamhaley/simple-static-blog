import Generator from './generator';
import { log } from './util';
import chokidar from 'chokidar';
export default function (sourceDirectory, destinationDirectory, templatesDirectory, title, rootURL, watchSource) {
    const generator = new Generator(sourceDirectory, destinationDirectory, templatesDirectory, title, rootURL);
    log.info('Starting');
    generator.generateAllPages();
    generator.logDebugInfo();
    if (watchSource) {
        log.info('Watching for changes');
        const watcher = chokidar.watch(sourceDirectory, {
            ignoreInitial: true,
            persistent: true
        });
        watcher.on('change', (path) => {
            console.log('change at:', path);
            generator.generateSinglePage(path);
        });
        watcher.on('unlinked', (path) => {
            console.log('removed at:', path);
            generator.generateSinglePage(path);
        });
        watcher.on('add', (path) => {
            console.log('add at:', path);
            generator.generateSinglePage(path);
        });
        process.on('SIGINT', function () {
            console.log('Stopping');
            process.exit();
        });
    }
}
//# sourceMappingURL=index.js.map