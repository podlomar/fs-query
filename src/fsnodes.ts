import fs from 'fs';
import { Result, success, fail } from 'monadix/result';
import path from 'path';
import { errors, FsError } from './errors.js';

export interface FSStats {
  size: number;
  atime: number;
  mtime: number;
  ctime: number;
  birthtime: number;
}

export interface BaseFSNode {
  readonly path: string;
  readonly parsedPath: path.ParsedPath;
  readonly stats: FSStats;
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
  const stats = fs.statSync(resolvedPath, { throwIfNoEntry: false });
  if (stats === undefined) {
    return fail(errors.notFound(resolvedPath));
  }

  const parsedPath = path.parse(resolvedPath);
  return success({
    type: stats.isDirectory() ? 'folder' : 'file',
    path: resolvedPath,
    parsedPath,
    stats: {
      size: stats.size,
      atime: stats.atimeMs,
      mtime: stats.mtimeMs,
      ctime: stats.ctimeMs,
      birthtime: stats.birthtimeMs
    }
  });
}

export const createFolderNode = (folderPath: string): Result<FolderNode, FsError> => (
  createFsNode(folderPath).chain((node): Result<FolderNode, FsError> => {
    if (node.type !== 'folder') {
      return fail(errors.notAFolder(folderPath));
    }

    return success(node as FolderNode);
  })
);

export const createFileNode = (filePath: string): Result<FileNode, FsError> => {
  const resolvedPath = path.resolve(filePath);
  const stats = fs.statSync(resolvedPath, { throwIfNoEntry: false });
  if (stats === undefined) {
    return fail(errors.notFound(resolvedPath));
  }

  if (!stats.isFile()) {
    return fail(errors.notAFile(resolvedPath));
  }

  const parsedPath = path.parse(resolvedPath);
  return success({
    type: 'file',
    path: resolvedPath,
    parsedPath,
    stats: {
      size: stats.size,
      atime: stats.atimeMs,
      mtime: stats.mtimeMs,
      ctime: stats.ctimeMs,
      birthtime: stats.birthtimeMs
    }
  });
}
