self.importScripts("/sw-toolbox.js");

self.toolbox.precache(['/favicon.png']);
self.toolbox.router.get('/*', toolbox.networkFirst);