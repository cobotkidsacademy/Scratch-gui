# Admin Page Setup Guide

## Issue: 404 on /admin.html

If you're getting a 404 error when accessing `/admin.html`, follow these steps:

## Step 1: Stop the Webpack Dev Server

If the webpack dev server is currently running:
- Press `Ctrl+C` in the terminal where it's running
- Wait for it to fully stop

## Step 2: Restart the Webpack Dev Server

```bash
cd eidtors/scratch/scratch-gui
npm start
```

## Step 3: Wait for Compilation

You should see output like:
```
webpack compiled successfully
```

Look for any errors in the compilation output. The admin entry should be included.

## Step 4: Verify Admin Entry Point

Check the compilation output - you should see something like:
```
Entrypoint admin = admin.html admin.js
```

## Step 5: Access the Admin Page

Once compilation is complete, open:
```
http://localhost:8601/admin.html
```

## Troubleshooting

### If admin.html still doesn't work:

1. **Check webpack config**: Verify that `admin` entry point exists in `webpack.config.js`
   ```javascript
   entry: {
       admin: './src/playground/admin.jsx'
   }
   ```

2. **Check HTML plugin**: Verify that HtmlWebpackPlugin includes admin:
   ```javascript
   .addPlugin(new HtmlWebpackPlugin({
       chunks: ['admin'],
       filename: 'admin.html',
       ...
   }))
   ```

3. **Check for build errors**: Look for any errors in the webpack compilation output

4. **Clear cache and rebuild**:
   ```bash
   npm run clean
   npm start
   ```

## About the CSP Warning

The Content Security Policy warning about Chrome DevTools is **harmless** and can be ignored. It's just Chrome trying to connect to a DevTools endpoint that doesn't exist.

## Required Services

Make sure both servers are running:
- **Scratch GUI**: `http://localhost:8601` (webpack dev server)
- **Assets Admin**: `http://localhost:8602` (for API calls)
