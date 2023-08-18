export interface FsError {
  readonly code: string;
  readonly message: string;
  readonly meta?: unknown;
}

export const errors = {
  notFound: (path: string): FsError => ({
    code: 'not-found',
    message: `Path not found: ${path}`
  }),
  notAFolder: (path: string): FsError => ({
    code: 'not-folder',
    message: `Path is not a folder: ${path}`
  }),
  notAFile: (path: string): FsError => ({
    code: 'not-file',
    message: `Path is not a file: ${path}`
  }),
};
