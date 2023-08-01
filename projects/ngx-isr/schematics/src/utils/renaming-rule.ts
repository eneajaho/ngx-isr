import {chain, Rule, SchematicContext, Tree} from '@angular-devkit/schematics';
import {
  addImports,
  createProject,
  getImports,
  ImportSpecifier,
  ImportSpecifierStructure,
  Pattern,
  saveActiveProject,
  setActiveProject,
} from 'ng-morph';

import {formatFiles} from './format-files';
import {
  addPackageJsonDependency,
  NodeDependencyType,
  removePackageJsonDependency
} from "@schematics/angular/utility/dependencies";
import {getLatestNodeVersion} from "./get-latest-node-version";

type ImportConfig = Pick<ImportSpecifierStructure, 'alias' | 'name'>;
type RenameConfig = Record<string, string | [string, string]>;
type ClassRenameConfig = Record<string, string>;

export function renamingRule(packageNames: Pattern[], renames: RenameConfig, classRenames: ClassRenameConfig): Rule {
  const getRename = configureRenames(renames, classRenames);

  return (): Rule => {
    return chain([
      (tree: Tree) => {
        setActiveProject(createProject(tree, '/', ['**/*.ts']));

        for (let packageName of packageNames) {

          const imports = getImports('**/*.ts', {
            moduleSpecifier: packageName,
          });
          const newImports = new Map<string, ImportConfig[]>();

          for (const importDeclaration of imports) {
            const namedImports = importDeclaration.getNamedImports();

            for (const namedImport of namedImports) {
              const oldName = namedImport.getName();
              const rename = getRename(oldName);

              if (rename == null) {
                continue;
              }

              const filePath = importDeclaration
                .getSourceFile()
                .getFilePath()
                .toString();
              const key = `${filePath}__${rename.moduleSpecifier}`;
              const namedImportConfig: ImportConfig = {
                name: rename.namedImport,
              };

              if (namedImport.getAliasNode()) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                namedImportConfig.alias = namedImport.getAliasNode()!.getText();
              }

              if (newImports.has(key)) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const value = newImports.get(key)!;
                newImports.set(key, [...value, namedImportConfig]);
              } else {
                newImports.set(key, [namedImportConfig]);
              }

              renameReferences(namedImport, oldName, rename.namedImport);
              namedImport.remove();
            }

            if (importDeclaration.getNamedImports().length === 0) {
              importDeclaration.remove();
            }
          }

          for (const [key, namedImports] of newImports.entries()) {
            const [filePath, moduleSpecifier] = key.split('__');
            addImports(filePath, {
              namedImports: namedImports,
              moduleSpecifier: moduleSpecifier,
            });
          }
        }
        saveActiveProject();
      },
      replacePackageJsonDepsRule(),
      formatFiles(),
      (_, context: SchematicContext) => {
        context.logger.info(`⚠️ Please run "npm install" to install the new dependencies!`);
        context.logger.info(`🎉️ Migration completed successfully!`);
      }
    ]);
  };
}

function renameReferences(
  importSpecifier: ImportSpecifier,
  oldName: string,
  newName: string
) {
  importSpecifier
    .getNameNode()
    .findReferencesAsNodes()
    .forEach((ref) => {
      if (ref.getText() === oldName) {
        ref.replaceWithText(newName);
      }
    });
}

/**
 * Returns a function that can be used to rename imports.
 *
 * @param renames
 * @param classRenames
 */
function configureRenames(renames: RenameConfig, classRenames: ClassRenameConfig) {
  return (namedImport: string) => {
    if (renames[namedImport] == null) {
      return null;
    }

    const newNamedImport = Array.isArray(renames[namedImport])
      ? getNewClassName(renames[namedImport][0], classRenames)
      : getNewClassName(namedImport, classRenames);

    return {
      namedImport: newNamedImport,
      moduleSpecifier: Array.isArray(renames[namedImport])
        ? renames[namedImport][1]
        : (renames[namedImport] as string),
    };
  };
}

function getNewClassName(oldName: string, classRenames: ClassRenameConfig) {
  return classRenames[oldName] || oldName;
}

function replacePackageJsonDepsRule(): Rule {
  return async (tree: Tree, context: SchematicContext) => {
    const oldDepName = 'ngx-isr';
    const newDepName = '@rx-angular/isr';

    removePackageJsonDependency(tree, oldDepName);
    context.logger.info(`❌️ Removed dependency ${oldDepName}`);

    const version = await getLatestNodeVersion(newDepName);
    addPackageJsonDependency(tree, {
      name: newDepName,
      type: NodeDependencyType.Default,
      overwrite: true,
      version,
    });

    context.logger.info(`✅️ Added dependency ${newDepName}@${version}`);
  }
}
