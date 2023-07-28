import {Tree} from '@angular-devkit/schematics';
import {
  SchematicTestRunner,
  UnitTestTree,
} from '@angular-devkit/schematics/testing';
import * as path from 'path';

describe('isr migrate-to-rx-angular-isr', () => {
  let appTree: UnitTestTree | undefined;

  it('should replace ngx-isr/server and class names', async () => {
    appTree = await setupTestFile(`
      import { BrowserModule } from '@angular/platform-browser';
      import { NgxIsrModule,
               provideISR,
               ISRHandler,
               FileSystemCacheHandler,
               FileSystemCacheOptions
             } from 'ngx-isr/server';
      import { AppComponent } from './app.component';

      @NgModule({
        declarations: [
          AppComponent,
        ],
        imports: [
          BrowserModule,
          NgxIsrModule.forRoot()
        ],
        bootstrap: [AppComponent]
      })
      export class AppModule { }
  `);

    const file = appTree?.readContent('app.module.ts');

    // @ts-ignore
    expect(file).toMatchSnapshot();
  });

  it('should replace ngx-isr/models and class names', async () => {
    appTree = await setupTestFile(`
      import { BrowserModule } from '@angular/platform-browser';
      import { INgxIsrService, NgxIsrState } from 'ngx-isr/models';
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

  it('should replace ngx-isr/browser and class names', async () => {
    appTree = await setupTestFile(`
      import { BrowserModule } from '@angular/platform-browser';
      import { NgxIsrService } from 'ngx-isr/browser';
      import { AppComponent } from './app.component';

      @NgModule({
        declarations: [
          AppComponent,
        ],
        imports: [
          BrowserModule
        ],
        providers: [NgxIsrService],
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

    return runner.runSchematic(`migrate-to-rx-angular-isr`, {}, tree);
  }

});
