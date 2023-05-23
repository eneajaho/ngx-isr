import {
  chain,
  Rule,
  SchematicContext,
  Tree,
} from '@angular-devkit/schematics';
import {
  NodeDependency,
  NodeDependencyType,
} from '@schematics/angular/utility/dependencies';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import { addPackageJsonDependency } from '@schematics/angular/utility/dependencies';

import { Dependency } from '../../utils/dependency';
import { getLatestNodeVersion } from '../../utils/get-latest-node-version';
import {removePackageJsonDependency} from "ng-morph";
import {getVersion} from "jest";

const dependencies: Dependency[] = [
  {
    type: NodeDependencyType.Dev,
    name: '@rx-angular/isr',
    overwrite: true,
  },
];

const old_dependencies: Dependency =
  {
    type: NodeDependencyType.Dev,
    name: 'ngx-isr',
    overwrite: true,
  };


function addPackageJsonDependencies(packages: Dependency[]): Rule {
  return async (tree: Tree, context: SchematicContext) => {
    for await (const dependency of packages) {

      removePackageJsonDependency(tree, old_dependencies.name);
      context.logger.info(`❌️ Removed dependency ${old_dependencies.name}`);

      const version = await getLatestNodeVersion(dependency.name);
      addPackageJsonDependency(tree, { ...dependency, version });
      context.logger.info(`✅️ Added dependency ${dependency.name}@${version}`);
    }
  };
}

function installDependencies(): Rule {
  return (tree: Tree, ctx: SchematicContext) => {
    ctx.addTask(new NodePackageInstallTask());
    ctx.logger.info('✅️ Dependencies installed');
    return tree;
  };
}

export function ngAdd(): Rule {
  return chain([
    addPackageJsonDependencies(dependencies),
    installDependencies(),
  ]);
}
