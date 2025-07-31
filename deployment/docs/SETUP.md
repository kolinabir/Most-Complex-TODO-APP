# TodoLang Application Setup Instructions

## Prerequisites

- A web server capable of serving static files
- Modern web browser with JavaScript enabled

## Installation Steps

### Option 1: Static File Hosting

1. **Upload Files**
   ```bash
   # Upload all files from the deployment package to your web server
   scp -r deployment/* user@yourserver.com:/var/www/html/
   ```

2. **Configure Web Server**
   - Ensure your web server serves `.html`, `.js`, and `.json` files
   - Set appropriate MIME types if needed
   - Enable gzip compression for better performance

3. **Test Installation**
   - Navigate to your domain in a web browser
   - The TodoLang application should load automatically
   - Test adding, editing, and deleting todos

### Option 2: Local Development Server

1. **Using Python (Python 3)**
   ```bash
   cd deployment
   python -m http.server 8000
   ```

2. **Using Node.js**
   ```bash
   cd deployment
   npx serve .
   ```

3. **Using PHP**
   ```bash
   cd deployment
   php -S localhost:8000
   ```

## Configuration

### Web Server Configuration

#### Apache (.htaccess)
```apache
# Enable compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/css text/javascript application/javascript
</IfModule>

# Set cache headers
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType text/css "access plus 1 month"
    ExpiresByType application/javascript "access plus 1 month"
    ExpiresByType text/html "access plus 1 hour"
</IfModule>

# Security headers
Header always set X-Content-Type-Options nosniff
Header always set X-Frame-Options DENY
Header always set X-XSS-Protection "1; mode=block"
```

#### Nginx
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /var/www/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/css application/javascript text/html;

    # Cache static assets
    location ~* \.(js|css)$ {
        expires 1M;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";
}
```

## Verification

After setup, verify the installation by:

1. **Loading the Application**
   - Open your browser and navigate to the application URL
   - You should see the TodoLang Todo Application interface

2. **Testing Core Functionality**
   - Add a new todo item
   - Mark a todo as complete
   - Edit an existing todo
   - Delete a todo
   - Test the filter buttons (All, Active, Completed)

3. **Testing Persistence**
   - Add some todos
   - Refresh the page
   - Verify that todos are still present

4. **Testing URL Routing**
   - Click on different filter buttons
   - Verify that the URL changes
   - Refresh the page and verify the filter is maintained

## Troubleshooting

### Common Issues

1. **Application doesn't load**
   - Check browser console for JavaScript errors
   - Verify all files are uploaded correctly
   - Ensure web server is serving JavaScript files with correct MIME type

2. **Todos don't persist**
   - Check if localStorage is available in the browser
   - Verify the browser isn't in private/incognito mode
   - Check browser console for storage-related errors

3. **Styling issues**
   - Verify CSS is loading correctly
   - Check for browser compatibility issues
   - Ensure viewport meta tag is present

### Browser Console

Open browser developer tools (F12) and check the console for any error messages. Common errors and solutions:

- **"Script error"**: Check if JavaScript files are loading correctly
- **"localStorage is not defined"**: Browser doesn't support localStorage or is in private mode
- **"Cannot read property of undefined"**: JavaScript execution error, check browser compatibility

## Performance Optimization

### Optional Optimizations

1. **Enable HTTP/2**
   - Configure your web server to use HTTP/2 for better performance

2. **Add Service Worker**
   - Implement a service worker for offline functionality and caching

3. **Use CDN**
   - Serve static assets from a Content Delivery Network

4. **Monitor Performance**
   - Use browser developer tools to monitor load times
   - Consider using tools like Lighthouse for performance auditing

## Security Considerations

1. **HTTPS**
   - Always serve the application over HTTPS in production
   - Use tools like Let's Encrypt for free SSL certificates

2. **Content Security Policy**
   - Consider adding CSP headers for additional security

3. **Regular Updates**
   - Keep your web server software updated
   - Monitor for any security advisories

---

For more detailed deployment instructions, see `DEPLOYMENT.md`.
