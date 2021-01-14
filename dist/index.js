var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import Generator from './generator';
import { log } from './util';
import chokidar from 'chokidar';
import server from './server';
export default function (sourceDirectory, destinationDirectory, templatesDirectory, title, rootURL, watchSource, serve, port) {
    return __awaiter(this, void 0, void 0, function* () {
        const generator = new Generator(sourceDirectory, destinationDirectory, templatesDirectory, title, rootURL);
        log.info('Starting');
        yield generator.load();
        generator.generateAllPages();
        generator.logDebugInfo();
        if (serve) {
            server(destinationDirectory, port);
        }
        if (watchSource) {
            log.info('Watching for changes');
            const watcher = chokidar.watch(sourceDirectory, {
                ignoreInitial: true,
                persistent: true
            });
            watcher.on('change', (path) => __awaiter(this, void 0, void 0, function* () {
                console.log('change at:', path);
                yield generator.generateSinglePage(path);
            }));
            watcher.on('unlinked', (path) => __awaiter(this, void 0, void 0, function* () {
                console.log('removed at:', path);
                yield generator.generateSinglePage(path);
            }));
            watcher.on('add', (path) => __awaiter(this, void 0, void 0, function* () {
                console.log('add at:', path);
                yield generator.generateSinglePage(path);
            }));
            process.on('SIGINT', function () {
                console.log('Stopping');
                process.exit();
            });
        }
    });
}
//# sourceMappingURL=index.js.map