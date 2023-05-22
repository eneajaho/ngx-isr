import {Tree} from '@angular-devkit/schematics';
import {
  SchematicTestRunner,
  UnitTestTree,
} from '@angular-devkit/schematics/testing';
import * as path from 'path';

describe('isr migration update-0.5.6', () => {
  let appTree: UnitTestTree | undefined;

  it('should replace ngx-isr', async () => {
    appTree = await setupTestFile(`
      import { BrowserModule } from '@angular/platform-browser';
      import { NgxIsrModule,
               provideISR,
               ISRHandler,
               FileSystemCacheHandler,
               FileSystemCacheOptions
             } from '@rx-angular/isr/server';
      import { NgxIsrService } from '@rx-angular/isr/browser';
      import { CacheHandler,
               CacheISRConfig,
               CacheData,
               INgxIsrService,
               NgxIsrState,
               ISRHandlerConfig,
               InvalidateConfig,
               RenderConfig,
               ServeFromCacheConfig,
               RouteISRConfig
             } from '@rx-angular/isr/models';
      import { AppComponent } from './app.component';

      @NgModule({
        declarations: [
          AppComponent,
        ],
        imports: [
          BrowserModule
        ],
        bootstrap: [AppComponent]
      })
      export class AppModule { }
  `);

    const file = appTree?.readContent('app.module.ts');

    // @ts-ignore
    expect(file).toMatchSnapshot();
  });

  function setupTestFile(fileInput: string, filePath = './app.module.ts') {
    const runner = new SchematicTestRunner(
      'ngx-isr',
      path.join(__dirname, '../../../migration.json')
    );
    const tree = new UnitTestTree(Tree.empty());

    tree.create(filePath, fileInput);

    return runner.runSchematic(`update-0.5.6`, {}, tree);
  }
});
