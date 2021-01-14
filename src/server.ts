import express from 'express';

const app = express()

const server = (path: string, port: number) => {
  app.listen(port, () => {
    app.use(express.static(path))
    console.log(`Serving ${path} at http://localhost:${port}`)
  });
}

export default server;
