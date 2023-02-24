import {
  CacheHandler,
  InvalidateConfig,
  ISRHandlerConfig,
  RenderConfig,
  ServeFromCacheConfig,
} from './models';
import { InMemoryCacheHandler } from './cache-handlers';
import { renderUrl, RenderUrlConfig } from './utils/render-url';
import { getISROptions } from './utils/get-isr-options';
import { CacheRegeneration } from './cache-regeneration';
import { NextFunction, Request, Response } from 'express';
import { ISRLogger } from './isr-logger';

export class ISRHandler {
  protected cache!: CacheHandler;
  protected cacheRegeneration!: CacheRegeneration;

  protected isrConfig: ISRHandlerConfig;

  protected readonly logger: ISRLogger;

  constructor(config?: ISRHandlerConfig) {
    if (!config) {
      throw new Error('Provide ISRHandlerConfig!');
    }

    this.isrConfig = config;

    this.logger = new ISRLogger(config?.enableLogging ?? false);

    // if skipCachingOnHttpError is not provided it will default to true
    this.isrConfig.skipCachingOnHttpError =
      config?.skipCachingOnHttpError !== false;

    if (config.cache && config.cache instanceof CacheHandler) {
      this.logger.log('Using custom cache handler!');
      this.cache = config.cache;
    } else {
      this.logger.log('Using in memory cache handler!');
      this.cache = new InMemoryCacheHandler();
    }

    this.cacheRegeneration = new CacheRegeneration(
      this.cache,
      config.indexHtml
    );
  }

  async invalidate(
    req: Request,
    res: Response,
    config?: InvalidateConfig
  ): Promise<any> {
    const { token, urlsToInvalidate } = extractDataFromBody(req);
    const { indexHtml } = this.isrConfig;

    if (token !== this.isrConfig.invalidateSecretToken) {
      return res.json({ status: 'error', message: 'Your secret token is wrong!!!' });
    }

    if (!urlsToInvalidate || !urlsToInvalidate.length) {
      return res.json({ status: 'error', message: 'Please add `urlsToInvalidate` in the payload!' });
    }

    const notInCache: string[] = [];
    const urlWithErrors: Record<string, any> = {};

    for (const url of urlsToInvalidate) {
      const urlExists = await this.cache.has(url);

      if (!urlExists) {
        notInCache.push(url);
        continue;
      }

      try {
        // re-render the page again
        const html = await renderUrl({ req, res, url, indexHtml, providers: config?.providers });

        // get revalidate data in order to set it to cache data
        const { revalidate, errors } = getISROptions(html);

        // if there are errors when rendering the site we throw an error
        if (errors?.length && this.isrConfig.skipCachingOnHttpError) {
          urlWithErrors[url] = errors;
        }
        // add the regenerated page to cache
        await this.cache.add(req.url, html, { revalidate });
      } catch (err) {
        urlWithErrors[url] = err;
      }

    }

    const invalidatedUrls = urlsToInvalidate.filter(url => !notInCache.includes(url) && !urlWithErrors[url]);

    if (notInCache.length) {
      this.logger.log(`Urls: ${ notInCache.join(', ') } does not exist in cache.`);
    }

    if (Object.keys(urlWithErrors).length) {
      this.logger.log(`Urls: ${Object.keys(urlWithErrors).join(', ')} had errors while regenerating!`);
    }

    if (invalidatedUrls.length) {
      this.logger.log(`Urls: ${ invalidatedUrls.join(', ') } were regenerated!`);
    }

    const response = { status: 'success', notInCache, urlWithErrors, invalidatedUrls };
    return res.json(response);
  }

  async serveFromCache(
    req: Request,
    res: Response,
    next: NextFunction,
    config?: ServeFromCacheConfig
  ): Promise<any> {
    try {
      const cacheData = await this.cache.get(req.url);
      const { html, options, createdAt } = cacheData;

      // if the cache is expired, we will regenerate it
      if (options.revalidate && options.revalidate > 0) {
        const lastCacheDateDiff = (Date.now() - createdAt) / 1000; // in seconds

        if (lastCacheDateDiff > options.revalidate) {
          await this.cacheRegeneration.regenerate(
            req,
            res,
            cacheData,
            this.logger,
            config?.providers
          );
        }
      }

      // Apply the callback if given
      let finalHtml = html;
      if(config?.modifyCachedHtml) {
        const timeStart = performance.now();
        const result = config.modifyCachedHtml(html);
        finalHtml = result instanceof Promise ? await result : result;
        const totalTime = performance.now() - timeStart;
        finalHtml += `<!--\nℹ️ NgxISR: This cachedHtml has been modified with modifyCachedHtml()\n❗️ This resulted into more ${totalTime.toFixed(2)}ms of processing time.\n-->`;
      }

      // Cache exists. Send it.
      this.logger.log(`Page was retrieved from cache: `, req.url);
      return res.send(finalHtml);
    } catch (error) {
      // Cache does not exist. Serve user using SSR
      next();
    }
  }

  async render(
    req: Request,
    res: Response,
    next: NextFunction,
    config?: RenderConfig
  ): Promise<any> {
    const renderUrlConfig: RenderUrlConfig = {
      req,
      res,
      url: req.url,
      indexHtml: this.isrConfig.indexHtml,
      providers: config?.providers,
    };

    renderUrl(renderUrlConfig).then(async (html) => {
      const { revalidate, errors } = getISROptions(html);

      // Apply modifyGeneratedHtml if given
      let finalHtml = html;
      if(config?.modifyGeneratedHtml) {
         const result = config.modifyGeneratedHtml(html);
         finalHtml = result instanceof Promise ? await result : result;
      }

      // if we have any http errors when rendering the site, and we have skipCachingOnHttpError enabled
      // we don't want to cache it, and, we will fall back to client side rendering
      if (errors?.length && this.isrConfig.skipCachingOnHttpError) {
        this.logger.log('Http errors: \n', errors);
        return res.send(finalHtml);
      }

      // if revalidate is null we won't cache it
      // if revalidate is 0, we will never clear the cache automatically
      // if revalidate is x, we will clear cache every x seconds (after the last request) for that url

      if (revalidate === null || revalidate === undefined) {
        // don't do !revalidate because it will also catch "0"
        return res.send(finalHtml);
      }

      // Cache the rendered `html` for this request url to use for subsequent requests
      await this.cache.add(req.url, finalHtml, { revalidate });
      return res.send(finalHtml);
    });
  }
}

const extractDataFromBody = (
  req: Request
): { token: string | null; urlsToInvalidate: string[] } => {
  const { urlsToInvalidate, token } = req.body;
  return { urlsToInvalidate, token };
};
