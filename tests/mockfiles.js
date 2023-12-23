export default {
  '/projects': {
    'projectA': {
      'docs': {
        'readme.md': '# Project A Documentation'
      },
      'src': {
        'index.html': '<html><body><h1>Hello World!</h1></body></html>',
        'index.js': 'console.log("Hello World!");',
        'style.css': 'body { background-color: red; }',
      },
      'package.json': '{ "name": "projectA", "version": "1.0.0" }',
    },
    'projectB': {
      'src': {
        'index.js': 'console.log("Hello World!");',
      },
      'docs': {
        'readme.md': '# Project B Documentation'
      }
    }
  },
};

