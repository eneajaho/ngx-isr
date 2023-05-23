import {Tree} from '@angular-devkit/schematics';
import {
  SchematicTestRunner,
  UnitTestTree,
} from '@angular-devkit/schematics/testing';
import * as path from 'path';

describe('isr migration update-16.0.0', () => {
  let appTree: UnitTestTree | undefined;

  it('should replace ngx-isr/server', async () => {
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

  it('should replace ngx-isr/models', async () => {
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
        bootstrap: [AppComponent]
      })
      export class AppModule { }
  `);

    const file = appTree?.readContent('app.module.ts');

    // @ts-ignore
    expect(file).toMatchSnapshot();
  });

  it('should replace ngx-isr/browser', async () => {
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
      'ngx-isr/server',
      path.join(__dirname, '../../../migration.json')
    );
    const tree = new UnitTestTree(Tree.empty());

    tree.create(filePath, fileInput);

    return runner.runSchematic(`update-16.0.0`, {}, tree);
  }
});
