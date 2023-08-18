import fs from 'fs';
import path from 'path';
import { FsError, errors } from './errors.js';
import { FolderNode, createFolderNode, FileNode, FsNode, createFsNode } from './fsnodes.js';
import { Result, success, fail, Success } from 'monadix/result';

export { FsNode, FolderNode, FileNode };

export type QueryResult<T> = Result<T, FsError>;

const findOneByNames = (
  folder: FolderNode, names: string[],
): FsNode | null => {
  if (names.length === 0) {
    return null;
  }

  const file = names.length === 1
    ? path.join(folder.path, names[0])
    : fs.readdirSync(folder.path).find((dirent) => names.includes(dirent));

  if (file === undefined) {
    return null;
  }

  return createFsNode(file).match({
    success: (node): FsNode => node,
    fail: (): null => null,
  });
};

const findAllByNames = (
  folder: FolderNode, names: string[]
): FsNode[] => {
  const dirents = fs.readdirSync(folder.path);
  return names
    .reduce((acc, name) => {
      const file = dirents.find((dirent) => dirent === name);
      return file === undefined ? acc : [...acc, file];
    }, [] as string[])
  .map((dirent) => createFsNode(path.join(folder.path, dirent)))
  .filter((value): value is Success<FsNode> => value.isSuccess())
  .map((value) => value.get());
};

const findAllByPaths = (
  folder: FolderNode, paths: string[]
): FsNode[] => paths
  .map((p) => createFsNode(path.resolve(folder.path, p)))
  .filter((value): value is Success<FsNode> => value.isSuccess())
  .map((value) => value.get());

export class SingleSelect<T extends FileNode | FolderNode> {
  private readonly result: Result<FolderNode, FsError>;
  private readonly nodeType: 'file' | 'folder';

  private constructor(result: Result<FolderNode, FsError>, nodeType: 'file' | 'folder') {
    this.result = result;
    this.nodeType = nodeType;
  }

  public static file(result: Result<FolderNode, FsError>): SingleSelect<FileNode> {
    return new SingleSelect(result, 'file');
  }

  public static folder(result: Result<FolderNode, FsError>): SingleSelect<FolderNode> {
    return new SingleSelect(result, 'folder');
  }

  public byName(name: string, ...extensions: string[]): Result<T, FsError> {
    const fileNames = extensions.length > 0
      ? extensions.map((ext) => `${name}.${ext}`)
      : [name];
    
    return this.result.chain(
      (folder): Result<T, FsError> => {
        const node = findOneByNames(folder, fileNames);
        if (node === null) {
          return fail(errors.notFound(folder.path));
        }

        if (node.type !== this.nodeType) {
          return fail(errors.notFound(folder.path));
        }

        return success(node as T);
      },
    );
  }

  // public byRegex(regex: RegExp): Result<FileNode, FsError> {
  //   return this.result.chain((folder): Result<FileNode, FsError> => {
  //     const dirents = fs.readdirSync(folder.path, { withFileTypes: true });
  //     const file = dirents.find(dirent => dirent.isFile() && regex.test(dirent.name));
  //     if (file === undefined) {
  //       return fail({
  //         code: 'not-found',
  //         message: `File matching ${regex} not found in folder ${folder.path}`,
  //         meta: {
  //           path: folder.path,
  //         },
  //       });
  //     }

  //     return createFileNode(path.join(folder.path, file.name));
  //   });
  // }
}

export class MultiSelect<T extends FsNode> {
  private readonly result: Result<FolderNode, FsError>;
  private readonly nodeType: 'node' | 'folder' | 'file';

  private constructor(result: Result<FolderNode, FsError>, nodeType: 'node' | 'folder' | 'file') {
    this.result = result;
    this.nodeType = nodeType;
  }

  public static node(result: Result<FolderNode, FsError>): MultiSelect<FsNode> {
    return new MultiSelect(result, 'node');
  }

  public static file(result: Result<FolderNode, FsError>): MultiSelect<FileNode> {
    return new MultiSelect(result, 'file');
  }

  public static folder(result: Result<FolderNode, FsError>): MultiSelect<FolderNode> {
    return new MultiSelect(result, 'folder');
  }

  public byName(name: string, ...extensions: string[]): Result<T[], FsError> {
    return this.byNames([name], ...extensions);
  }

  public byNames(names: string[], ...extensions: string[]): Result<T[], FsError> {
    const extNames = names.flatMap((name) => extensions.map((ext) => `${name}.${ext}`));
    const fileNames = extensions.length === 0 || this.nodeType === 'node'
      ? [...names, ...extNames]
      : extNames;

    return this.result.chain(
      (folder): Result<T[], FsError> => success(
        findAllByNames(folder, fileNames)
          .filter((node): node is T => (
            this.nodeType === 'node' || node.type === this.nodeType
          )
        ),
      )
    );
  }

  public byPaths(paths: string[], ...extensions: string[]): Result<T[], FsError> {
    const extPaths = paths.flatMap((p) => extensions.map((ext) => `${p}.${ext}`));
    const filePaths = extensions.length === 0 || this.nodeType === 'node'
      ? [...paths, ...extPaths]
      : extPaths;

    return this.result.chain(
      (folder): Result<T[], FsError> => success(
        findAllByPaths(folder, filePaths)
          .filter((node): node is T => (
            this.nodeType === 'node' || node.type === this.nodeType
          )
        ),
      )
    );
  }
}

export class Select {
  private readonly result: Result<FolderNode, FsError>;

  public constructor(result: Result<FolderNode, FsError>) {
    this.result = result;
  } 

  public get file(): SingleSelect<FileNode> {
    return SingleSelect.file(this.result);
  }

  public get folder(): SingleSelect<FolderNode> {
    return SingleSelect.folder(this.result);
  }

  public get nodes(): MultiSelect<FsNode> {
    return MultiSelect.node(this.result);
  }

  public get files(): MultiSelect<FileNode> {
    return MultiSelect.file(this.result);
  }

  public get folders(): MultiSelect<FolderNode> {
    return MultiSelect.folder(this.result);
  }
}

export class FolderQuery {
  public readonly result: Result<FolderNode, FsError>;

  public constructor(result: Result<FolderNode, FsError>) {
    this.result = result;
  }
  
  public cd(folderPath: string): FolderQuery {
    return this.result.match({
      success: (folderNode): FolderQuery => folder(path.join(folderNode.path, folderPath)),
      fail: (error): FolderQuery => new FolderQuery(fail(error)),
    });
  }

  public get select(): Select {
    return new Select(this.result);
  }
}

export const folder = (source: string | FolderNode): FolderQuery => (
  typeof source === 'string'
    ? new FolderQuery(createFolderNode(source))
    : new FolderQuery(success(source))
);

export class FsNodeQuery {
  private readonly result: Result<FsNode, FsError>;

  public constructor(result: Result<FsNode, FsError>) {
    this.result = result;
  }

  public get asFolder(): FolderQuery {
    return this.result.match({
      success: (node): FolderQuery => node.type === 'folder'
        ? new FolderQuery(success(node))
        : new FolderQuery(fail(errors.notAFolder(node.path))),
      fail: (error): FolderQuery => new FolderQuery(fail(error)),
    });
  }

  public get(): Result<FsNode, FsError> {
    return this.result;
  }

  public get parent(): FolderQuery {
    return this.result.match({
      success: (node): FolderQuery => new FolderQuery(
        createFolderNode(path.dirname(node.path)),
      ),
      fail: (error): FolderQuery => new FolderQuery(fail(error)),
    });
  }
}

export const fsNode = (fspath: string | FsNode): FsNodeQuery => (
  typeof fspath === 'string'
    ? new FsNodeQuery(createFsNode(fspath))
    : new FsNodeQuery(success(fspath))
);
