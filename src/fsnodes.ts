import fs from 'fs';
import { Result } from 'monadix/result';
import path from 'path';
import { errors, FsError } from './errors.js';

export interface BaseFSNode {
  readonly path: string;
  readonly fileName: string;
  readonly ext: string;
}

export interface FileNode extends BaseFSNode {
  readonly type: 'file';
}

export interface FolderNode extends BaseFSNode {
  readonly type: 'folder';
}

export type FsNode = FileNode | FolderNode;

export type FsNodeType = FsNode['type'];

export const createFsNode = (fsPath: string): Result<FsNode, FsError> => {
  const resolvedPath = path.resolve(fsPath);
  
  try {
    const stats = fs.statSync(resolvedPath);
    if (stats === undefined) {
      return Result.fail(errors.notFound(resolvedPath));
    }

    const parsedPath = path.parse(resolvedPath);
    return Result.success({
      type: stats.isDirectory() ? 'folder' : 'file',
      path: resolvedPath,
      fileName: parsedPath.name,
      ext: parsedPath.ext,
    });
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      return Result.fail(errors.notFound(resolvedPath));
    }

    return Result.fail({
      code: 'unknown',
      message: err.message,
      meta: err,
    });
  }
}

export const createFolderNode = (folderPath: string): Result<FolderNode, FsError> => (
  createFsNode(folderPath).chain((node): Result<FolderNode, FsError> => {
    if (node.type !== 'folder') {
      return Result.fail(errors.notAFolder(folderPath));
    }

    return Result.success(node as FolderNode);
  })
);

export const createFileNode = (filePath: string): Result<FileNode, FsError> => (
  createFsNode(filePath).chain((node): Result<FileNode, FsError> => {
    if (node.type !== 'file') {
      return Result.fail(errors.notAFolder(filePath));
    }

    return Result.success(node as FileNode);
  })
);

