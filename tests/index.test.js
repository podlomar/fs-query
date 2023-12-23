import fs from 'fs';
import { describe } from 'mocha';
import mock from 'mock-fs';
import { expect } from 'chai';
import mockfiles from './mockfiles.js';
import { createFsNode, createFolderNode, createFileNode } from '../dist/fsnodes.js';
import { folder } from '../dist/index.js';

describe('FsNodes', () => {
  before(() => {
    mock(mockfiles);
  });

  after(() => {
    mock.restore();
  });

  describe('createFsNode', () => {
    it('should create a folder node', () => {
      const result = createFsNode('/projects');
      expect(result.isSuccess()).to.be.true;
      expect(result.get()).to.deep.equal({
        type: 'folder',
        path: '/projects',
        fileName: 'projects',
        ext: ''
      });
    });

    it('should create a file node', () => {
      const result = createFsNode('/projects/projectA/src/index.js');
      expect(result.isSuccess()).to.be.true;
      expect(result.get()).to.deep.equal({
        type: 'file',
        path: '/projects/projectA/src/index.js',
        fileName: 'index',
        ext: '.js'
      });
    });

    it('should fail to create a node from a non-existent path', () => {
      const result = createFsNode('/projects/projectA/src/index.ts');
      expect(result.isFail()).to.be.true;
    });
  });

  describe('createFolderNode', () => {
    it('should create a folder node', () => {
      const result = createFolderNode('/projects');
      expect(result.isSuccess()).to.be.true;
      expect(result.get()).to.deep.equal({
        type: 'folder',
        path: '/projects',
        fileName: 'projects',
        ext: ''
      });
    });

    it('should fail to create a folder node from a file path', () => {
      const result = createFolderNode('/projects/projectA/src/index.js');
      expect(result.isFail()).to.be.true;
    });
  });

  describe('createFileNode', () => {
    it('should create a file node', () => {
      const result = createFileNode('/projects/projectA/src/index.js');
      expect(result.isSuccess()).to.be.true;
      expect(result.get()).to.deep.equal({
        type: 'file',
        path: '/projects/projectA/src/index.js',
        fileName: 'index',
        ext: '.js'
      });
    });

    it('should fail to create a file node from a folder path', () => {
      const result = createFileNode('/projects');
      expect(result.isFail()).to.be.true;
    });
  });

  describe('FolderQuery', () => {
    it('should cd into a folder', () => {
      const folderNode = createFolderNode('/projects').getOrThrow();
      const query1 = folder(folderNode).cd('projectA');
      expect(query1.result.isSuccess()).to.be.true;
      expect(query1.result.get()).to.deep.equal({
        type: 'folder',
        path: '/projects/projectA',
        fileName: 'projectA',
        ext: ''
      });

      const query2 = query1.cd('../projectB');
      expect(query2.result.isSuccess()).to.be.true;
      expect(query2.result.get()).to.deep.equal({
        type: 'folder',
        path: '/projects/projectB',
        fileName: 'projectB',
        ext: ''
      });
    });

    it('should fail to cd into a non-existent folder', () => {
      const folderNode = createFolderNode('/projects').getOrThrow();
      const query = folder(folderNode).cd('projectC');
      expect(query.result.isFail()).to.be.true;
    });

    it('should select all files in a folder', () => {
      const folderNode = createFolderNode('/projects/projectA/src').getOrThrow();
      const result = folder(folderNode).select.files.all();
      expect(result.isSuccess()).to.be.true;
      expect(result.get()).to.deep.equal([
        {
          type: 'file',
          path: '/projects/projectA/src/index.html',
          fileName: 'index',
          ext: '.html'
        },
        {
          type: 'file',
          path: '/projects/projectA/src/index.js',
          fileName: 'index',
          ext: '.js'
        },
        {
          type: 'file',
          path: '/projects/projectA/src/style.css',
          fileName: 'style',
          ext: '.css'
        }
      ]);
    });

    it('should select all files with an extension in a folder', () => {
      const folderNode = createFolderNode('/projects/projectA/src').getOrThrow();
      const result = folder(folderNode).select.files.all('.js', '.css');
      expect(result.isSuccess()).to.be.true;
      expect(result.get()).to.deep.equal([
        {
          type: 'file',
          path: '/projects/projectA/src/index.js',
          fileName: 'index',
          ext: '.js'
        },
        {
          type: 'file',
          path: '/projects/projectA/src/style.css',
          fileName: 'style',
          ext: '.css'
        }
      ]);
    });

    it('should select all folders in a folder', () => {
      const folderNode = createFolderNode('/projects/projectA').getOrThrow();
      const result = folder(folderNode).select.folders.all();
      expect(result.isSuccess()).to.be.true;
      expect(result.get()).to.deep.equal([
        {
          type: 'folder',
          path: '/projects/projectA/docs',
          fileName: 'docs',
          ext: ''
        },
        {
          type: 'folder',
          path: '/projects/projectA/src',
          fileName: 'src',
          ext: ''
        },
      ]);
    });
  });

  it('should select all nodes in a folder', () => {
    const folderNode = createFolderNode('/projects/projectA').getOrThrow();
    const result = folder(folderNode).select.nodes.all();
    expect(result.isSuccess()).to.be.true;
    expect(result.get()).to.deep.equal([
      {
        type: 'folder',
        path: '/projects/projectA/docs',
        fileName: 'docs',
        ext: ''
      },
      {
        type: 'file',
        path: '/projects/projectA/package.json',
        fileName: 'package',
        ext: '.json'
      },
      {
        type: 'folder',
        path: '/projects/projectA/src',
        fileName: 'src',
        ext: ''
      },
    ]);
  });


});
