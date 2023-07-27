import {renamingRule} from '../../utils/renaming-rule';

const renames: Record<string, string | [string, string]> = {
  // SERVER
  'NgxIsrModule': '@rx-angular/isr/server',
  'provideISR': '@rx-angular/isr/server',
  'ISRHandler': '@rx-angular/isr/server',
  'FileSystemCacheHandler': '@rx-angular/isr/server',
  'FileSystemCacheOptions': '@rx-angular/isr/server',
  // BROWSER
  'NgxIsrService': '@rx-angular/isr/browser',
  // MODELS
  'CacheHandler': '@rx-angular/isr/models',
  'CacheISRConfig': '@rx-angular/isr/models',
  'CacheData': '@rx-angular/isr/models',
  'INgxIsrService': '@rx-angular/isr/models',
  'NgxIsrState': '@rx-angular/isr/models',
  'ISRHandlerConfig': '@rx-angular/isr/models',
  'InvalidateConfig': '@rx-angular/isr/models',
  'RenderConfig': '@rx-angular/isr/models',
  'ServeFromCacheConfig': '@rx-angular/isr/models',
  'RouteISRConfig': '@rx-angular/isr/models'
};

const classRenames: Record<string, string> = {
  'NgxIsrModule': 'IsrModule',
  'NgxIsrService': 'IsrService',
  'NgxIsrState': 'IsrState',
  'INgxIsrService': 'IsrServiceInterface'
};

export default renamingRule('ngx-isr/server', renames, classRenames);
