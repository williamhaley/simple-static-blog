import * as fs from 'fs';
import Generator from './generator';
import { log } from './util';
export default function (sourceDirectory, destinationDirectory, templatesDirectory, title, rootURL, watchSource) {
    const generator = new Generator(sourceDirectory, destinationDirectory, templatesDirectory, title, rootURL);
    log.info('Starting');
    generator.generatePages();
    generator.generateSiteMap();
    generator.generateIndexXml();
    generator.generateBlogXml();
    generator.logDebugInfo();
    if (watchSource) {
        log.info('Watching for changes');
        fs.watch(sourceDirectory, {
            persistent: true,
            recursive: true,
        }, (eventType, filePath) => {
            console.log(`change: ${eventType} ${filePath}`);
        });
        process.on('SIGINT', function () {
            console.log('Stopping');
            process.exit();
        });
    }
}
//# sourceMappingURL=index.js.map