import { environment } from './src/environments/environment';
import 'zone.js/dist/zone-node';

import { ngExpressEngine } from '@nguniversal/express-engine';
import * as express from 'express';
import { join } from 'path';

import { AppServerModule } from './src/main.server';
import { existsSync } from 'fs';

import { FileSystemCacheHandler, ISRHandler } from 'ngx-isr';
import { RedisCacheHandler } from './redis-cache-handler';

// The Express app is exported so that it can be used by serverless Functions.
export function app(): express.Express {
  const server = express();
  const distFolder = join(process.cwd(), 'dist/ngx-isr-demo/browser');
  const indexHtml = existsSync(join(distFolder, 'index.original.html'))
    ? 'index.original.html'
    : 'index';

  const REDIS_CONNECTION_STRING = process.env['REDIS_CONNECTION_STRING'] || '';
  const INVALIDATE_TOKEN = process.env['INVALIDATE_TOKEN'] || '';

  // Step 0 (optional): Create FileSystemCacheHandler with required options.
  const fsCacheHandler = new FileSystemCacheHandler({
    cacheFolderPath: join(distFolder, '/cache'),
    prerenderedPagesPath: distFolder,
    addPrerenderedPagesToCache: true,
  });

  const redisCacheHandler = REDIS_CONNECTION_STRING
    ? new RedisCacheHandler(REDIS_CONNECTION_STRING)
    : undefined;

  // Step 1: Initialize ISRHandler
  const isr = new ISRHandler({
    indexHtml,
    cache: fsCacheHandler,
    // cache: redisCacheHandler, // we can remove this field if we want to use the default InMemoryCacheHandler
    invalidateSecretToken: INVALIDATE_TOKEN || 'MY_TOKEN',
    enableLogging: !environment.production,
  });

  // Our Universal express-engine (found @ https://github.com/angular/universal/tree/master/modules/express-engine)
  server.engine(
    'html',
    ngExpressEngine({
      bootstrap: AppServerModule,
    })
  );

  server.set('view engine', 'html');
  server.set('views', distFolder);

  // needed for post requests in our case we use it for the invalidation url
  server.use(express.json());

  // Example Express Rest API endpoints
  // server.get('/api/**', (req, res) => { });

  // Step 2: Add invalidation url handler
  server.post(
    '/api/invalidate',
    async (req, res) => await isr.invalidate(req, res)
  );

  // Serve static files from /browser
  server.get('*.*', express.static(distFolder, { maxAge: '1y' }));

  // Step 3: handle rendering and serving using ISR handler
  server.get('*',
    // Serve page if it exists in cache
    async (req, res, next) => await isr.serveFromCache(req, res, next),
    // Server side render the page and add to cache if needed
    async (req, res, next) => await isr.render(req, res, next)
  );

  // Step 4: Comment out default angular universal handler, because it's will be handled in ISR render method
  // (req, res) => {
  //   res.render(indexHtml, { req, providers: [{ provide: APP_BASE_HREF, useValue: req.baseUrl }] });
  // }

  return server;
}

function run(): void {
  const port = process.env['PORT'] || 4000;

  // Start up the Node server
  const server = app();
  server.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

// Webpack will replace 'require' with '__webpack_require__'
// '__non_webpack_require__' is a proxy to Node 'require'
// The below code is to ensure that the server is run only when not requiring the bundle.
declare const __non_webpack_require__: NodeRequire;
const mainModule = __non_webpack_require__.main;
const moduleFilename = (mainModule && mainModule.filename) || '';
if (moduleFilename === __filename || moduleFilename.includes('iisnode')) {
  run();
}

export * from './src/main.server';
