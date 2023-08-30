import path from 'path';
import { FsError, errors } from './errors.js';
import { FolderNode, createFolderNode, FileNode, FsNode, createFsNode, FsNodeType } from './fsnodes.js';
import { Result, success, fail, Success } from 'monadix/result';

export { FsNode, FolderNode, FileNode };

export type QueryResult<T> = Result<T, FsError>;

const findOneByPath = <T extends FsNode>(
  folder: FolderNode,
  nodePath: string,
  nodeType: 'node' | FsNodeType,
  extensions: string[] = [''],
): T | null => {
  for (const ext of extensions) {
    const node = createFsNode(path.resolve(folder.path, `${nodePath}${ext}`));
    if (node.isSuccess() && (nodeType === 'node' || node.get().type === nodeType)) {
      return node.get() as T;
    }
  }
  
  return null;
}

const findAllByPaths = <T extends FsNode>(
  folder: FolderNode,
  paths: string[],
  nodeType: 'node' | FsNodeType,
  extensions: string[] = [''],
): T[] => {
  const nodes: T[] = [];
  for (const p of paths) {
    const node = findOneByPath<T>(folder, p, nodeType, extensions);
    if (node !== null) {
      nodes.push(node);
    }
  }
  
  return nodes;
}

export class SingleSelect<T extends FileNode | FolderNode> {
  private readonly result: Result<FolderNode, FsError>;
  private readonly nodeType: FsNodeType;

  private constructor(result: Result<FolderNode, FsError>, nodeType: FsNodeType) {
    this.result = result;
    this.nodeType = nodeType;
  }

  public static file(result: Result<FolderNode, FsError>): SingleSelect<FileNode> {
    return new SingleSelect(result, 'file');
  }

  public static folder(result: Result<FolderNode, FsError>): SingleSelect<FolderNode> {
    return new SingleSelect(result, 'folder');
  }

  public byPath(nodePath: string, ...extensions: string[]): Result<T, FsError> {
    return this.result.chain(
      (folder): Result<T, FsError> => {
        const node = findOneByPath<T>(
          folder, nodePath, this.nodeType, extensions.length > 0 ? extensions : ['']
        );
        if (node === null) {
          return fail(errors.notFound(folder.path));
        }

        return success(node);
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
  private readonly nodeType: 'node' | FsNodeType;

  private constructor(result: Result<FolderNode, FsError>, nodeType: 'node' | FsNodeType) {
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

  public byPath(name: string, ...extensions: string[]): Result<T[], FsError> {
    return this.byPaths([name], ...extensions);
  }

  public byPaths(paths: string[], ...extensions: string[]): Result<T[], FsError> {
    return this.result.chain(
      (folder): Result<T[], FsError> => success(
        findAllByPaths(folder, paths, this.nodeType, extensions.length > 0 ? extensions : ['']),
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
