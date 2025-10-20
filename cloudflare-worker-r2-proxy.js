/**
 * Cloudflare Worker for R2 Proxy
 * Serves files from R2 bucket through custom domain
 * 
 * Setup Instructions:
 * 1. Create a new Cloudflare Worker
 * 2. Bind your R2 bucket to the worker
 * 3. Deploy this script
 * 4. Configure custom domain routing
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    
    // Only allow GET requests
    if (request.method !== 'GET') {
      return new Response('Method not allowed', { 
        status: 405,
        headers: {
          'Allow': 'GET'
        }
      });
    }
    
    // Remove leading slash and get the file path
    const filePath = pathname.startsWith('/') ? pathname.slice(1) : pathname;
    
    // If no file path, serve index.html or return 404
    if (!filePath || filePath === '') {
      try {
        const indexObject = await env.R2_BUCKET.get('index.html');
        if (indexObject === null) {
          return new Response('Index file not found', { status: 404 });
        }
        
        const headers = new Headers();
        indexObject.writeHttpMetadata(headers);
        headers.set('etag', indexObject.httpEtag);
        headers.set('Cache-Control', 'public, max-age=3600');
        
        return new Response(indexObject.body, { headers });
      } catch (error) {
        return new Response('Error serving index file', { status: 500 });
      }
    }
    
    try {
      // Get the file from R2 bucket with range and conditional support
      const object = await env.R2_BUCKET.get(filePath, {
        range: request.headers,
        onlyIf: request.headers
      });
      
      if (object === null) {
        return new Response('File not found', { status: 404 });
      }
      
      // Set appropriate headers
      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set('etag', object.httpEtag);
      
      // Set cache headers based on file type
      if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg') || 
          filePath.endsWith('.png') || filePath.endsWith('.gif') || 
          filePath.endsWith('.webp') || filePath.endsWith('.svg')) {
        headers.set('Cache-Control', 'public, max-age=31536000'); // 1 year for images
      } else if (filePath.endsWith('.css') || filePath.endsWith('.js')) {
        headers.set('Cache-Control', 'public, max-age=31536000'); // 1 year for assets
      } else if (filePath.endsWith('.mp4') || filePath.endsWith('.webm') || 
                 filePath.endsWith('.mov') || filePath.endsWith('.avi')) {
        headers.set('Cache-Control', 'public, max-age=86400'); // 1 day for videos
      } else {
        headers.set('Cache-Control', 'public, max-age=3600'); // 1 hour default
      }
      
      // Add CORS headers if needed
      headers.set('Access-Control-Allow-Origin', '*');
      headers.set('Access-Control-Allow-Methods', 'GET');
      headers.set('Access-Control-Allow-Headers', 'Content-Type');
      
      // Handle conditional requests - when no body is present, preconditions have failed
      return new Response("body" in object ? object.body : undefined, {
        status: "body" in object ? 200 : 412,
        headers
      });
      
    } catch (error) {
      console.error('Error fetching file:', error);
      return new Response('Internal server error', { status: 500 });
    }
  },
};
