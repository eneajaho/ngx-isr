import {
  SchematicTestRunner,
  UnitTestTree,
} from '@angular-devkit/schematics/testing';
import { join } from 'path';
import { readJsonInTree } from '../../utils/read-json-in-tree';

const collectionPath = join(__dirname, '../../../collection.json');

const workspaceOptions = {
  name: 'workspace',
  newProjectRoot: './',
  version: '10.1.0',
};

const defaultAppOptions = {
  name: 'ngx-isr',
};

const packageJsonContent = {
  "name": "my-package",
  "version": "0.0.0",
  "private": true,
  "scripts": {},
  "dependencies": {
    "ngx-isr": "^0.5.5",
  },
  "devDependencies": {}
}

describe('ng-add schematic', () => {
  let appTree: UnitTestTree;
  let schematicRunner: SchematicTestRunner;

  beforeEach(async () => {
    schematicRunner = new SchematicTestRunner(
      'ngx-isr/schematics',
      collectionPath
    );
    appTree = await schematicRunner
      .runExternalSchematic(
        '@schematics/angular',
        'workspace',
        workspaceOptions
      );

    appTree = await schematicRunner
      .runExternalSchematic(
        '@schematics/angular',
        'application',
        defaultAppOptions,
        appTree
      );

    appTree.overwrite('package.json', JSON.stringify(packageJsonContent));

  });

  it('should add proper package to dependencies', async () => {
    const packageJsonBefore = readJsonInTree(appTree, 'package.json');

    expect(packageJsonBefore.dependencies['ngx-isr']).toBeDefined();
    expect(packageJsonBefore.dependencies['@rx-angular/isr']).toBeUndefined();

    const tree = await schematicRunner
      .runSchematic('ng-add', undefined, appTree);

    const packageJson = readJsonInTree(tree, 'package.json');

    expect(packageJson.dependencies['ngx-isr']).toBeUndefined();
    expect(packageJson.dependencies['@rx-angular/isr']).toBeDefined();
  });

});
