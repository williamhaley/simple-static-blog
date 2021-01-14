import express from 'express';
const app = express();
const server = (path, port) => {
    app.listen(port, () => {
        app.use(express.static(path));
        console.log(`Serving ${path} at http://localhost:${port}`);
    });
};
export default server;
//# sourceMappingURL=server.js.map