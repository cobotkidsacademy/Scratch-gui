const path = require('path');
const webpack = require('webpack');

// Plugins
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const ScratchWebpackConfigBuilder = require('scratch-webpack-configuration');

// const STATIC_PATH = process.env.STATIC_PATH || '/static';

const commonHtmlWebpackPluginOptions = {
    // Google Tag Manager ID
    // Looks like 'GTM-XXXXXXX'
    gtm_id: process.env.GTM_ID || '',

    // Google Tag Manager env & auth info for alterative GTM environments
    // Looks like '&gtm_auth=0123456789abcdefghijklm&gtm_preview=env-00&gtm_cookies_win=x'
    // Taken from the middle of: GTM -> Admin -> Environments -> (environment) -> Get Snippet
    // Blank for production
    gtm_env_auth: process.env.GTM_ENV_AUTH || ''
};

const baseConfig = new ScratchWebpackConfigBuilder(
    {
        rootPath: path.resolve(__dirname),
        enableReact: true,
        shouldSplitChunks: false,
        publicPath: 'auto'
    })
    .setTarget('browserslist')
    .merge({
        output: {
            assetModuleFilename: 'static/assets/[name].[hash][ext][query]',
            library: {
                name: 'GUI',
                type: 'umd2'
            }
        },
        resolve: {
            fallback: {
                Buffer: require.resolve('buffer/'),
                stream: require.resolve('stream-browserify')
            }
        }
    })
    .addModuleRule({
        test: /\.(svg|png|wav|mp3|gif|jpg)$/,
        resourceQuery: /^$/, // reject any query string
        type: 'asset' // let webpack decide on the best type of asset
    })
    .addPlugin(new webpack.DefinePlugin({
        'process.env.DEBUG': Boolean(process.env.DEBUG),
        'process.env.GA_ID': `"${process.env.GA_ID || 'UA-000000-01'}"`,
        'process.env.GTM_ENV_AUTH': `"${process.env.GTM_ENV_AUTH || ''}"`,
        'process.env.GTM_ID': process.env.GTM_ID ? `"${process.env.GTM_ID}"` : null
    }))
    .addPlugin(new CopyWebpackPlugin({
        patterns: [
            {
                from: 'node_modules/scratch-blocks/media',
                to: 'static/blocks-media/default'
            },
            {
                from: 'node_modules/scratch-blocks/media',
                to: 'static/blocks-media/high-contrast'
            },
            {
                // overwrite some of the default block media with high-contrast versions
                // this entry must come after copying scratch-blocks/media into the high-contrast directory
                from: 'src/lib/themes/high-contrast/blocks-media',
                to: 'static/blocks-media/high-contrast',
                force: true
            },
            {
                context: 'node_modules/scratch-vm/dist/web',
                from: 'extension-worker.{js,js.map}',
                noErrorOnMissing: true
            }
        ]
    }));

if (!process.env.CI) {
    baseConfig.addPlugin(new webpack.ProgressPlugin());
}

// build the shipping library in `dist/`
const distConfig = baseConfig.clone()
    .merge({
        entry: {
            'scratch-gui': path.join(__dirname, 'src/index.js')
        },
        output: {
            path: path.resolve(__dirname, 'dist')
        }
    })
    .addExternals(['react', 'react-dom'])
    .addPlugin(
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: 'src/lib/libraries/*.json',
                    to: 'libraries',
                    flatten: true
                }
            ]
        })
    );

// build the examples and debugging tools in `build/`
const buildConfig = baseConfig.clone()
    .merge({
        entry: {
            gui: './src/playground/index.jsx',
            blocksonly: './src/playground/blocks-only.jsx',
            compatibilitytesting: './src/playground/compatibility-testing.jsx',
            player: './src/playground/player.jsx',
            admin: './src/playground/admin.jsx'
        },
        output: {
            path: path.resolve(__dirname, 'build')
        },
        // Exclude static/assets from watching to prevent disconnections
        // These files don't change during development, so no need to watch them
        watchOptions: {
            ignored: [
                '**/node_modules/**',
                '**/static/assets/**', // Exclude asset files (973 images + 355 sounds)
                '**/build/**',
                '**/dist/**'
            ],
            // Use polling on Windows for better reliability
            poll: process.platform === 'win32' ? 2000 : false, // Increased to 2 seconds
            aggregateTimeout: 1000 // Wait 1 second before rebuilding (increased from 300ms)
        },
        // Configure dev server to serve static files
        // IMPORTANT: Configure devServer BEFORE enableDevServer to ensure our config is used
        devServer: {
            port: process.env.PORT || 8601,
            host: '0.0.0.0', // Listen on all network interfaces (accessible from 192.168.x.x)
            static: [
                {
                    directory: path.join(__dirname, 'static'),
                    publicPath: '/static',
                    watch: false // Don't watch static assets (prevents disconnections)
                },
                {
                    directory: path.join(__dirname, 'build'),
                    publicPath: '/',
                    watch: false // Don't watch build directory either
                }
            ],
            // Allow serving files from static directory
            allowedHosts: 'all',
            // Prevent disconnections by configuring client
            client: {
                overlay: {
                    errors: true,
                    warnings: false
                },
                reconnect: 5 // Try to reconnect 5 times
            },
            // Disable live reload to prevent disconnections
            liveReload: false,
            hot: true,
            // Open browser automatically
            open: false,
            // Compress responses
            compress: true
        }
    })
    .enableDevServer(process.env.PORT || 8601)
    .addPlugin(new HtmlWebpackPlugin({
        ...commonHtmlWebpackPluginOptions,
        chunks: ['gui'],
        template: 'src/playground/index.ejs',
        title: 'Scratch 3.0 GUI'
    }))
    .addPlugin(new HtmlWebpackPlugin({
        ...commonHtmlWebpackPluginOptions,
        chunks: ['blocksonly'],
        filename: 'blocks-only.html',
        template: 'src/playground/index.ejs',
        title: 'Scratch 3.0 GUI: Blocks Only Example'
    }))
    .addPlugin(new HtmlWebpackPlugin({
        ...commonHtmlWebpackPluginOptions,
        chunks: ['compatibilitytesting'],
        filename: 'compatibility-testing.html',
        template: 'src/playground/index.ejs',
        title: 'Scratch 3.0 GUI: Compatibility Testing'
    }))
    .addPlugin(new HtmlWebpackPlugin({
        ...commonHtmlWebpackPluginOptions,
        chunks: ['player'],
        filename: 'player.html',
        template: 'src/playground/index.ejs',
        title: 'Scratch 3.0 GUI: Player Example'
    }))
    .addPlugin(new HtmlWebpackPlugin({
        ...commonHtmlWebpackPluginOptions,
        chunks: ['admin'],
        filename: 'admin.html',
        template: 'src/playground/index.ejs',
        title: 'Scratch Library Admin'
    }))
    .addPlugin(new CopyWebpackPlugin({
        patterns: [
            {
                from: 'static',
                to: 'static'
            },
            {
                from: 'extensions/**',
                to: 'static',
                context: 'src/examples'
            },
            {
                // Copy assets directory so static assets are served by webpack
                from: 'static/assets',
                to: 'static/assets',
                noErrorOnMissing: true
            }
        ]
    }));

// Skip building `dist/` unless explicitly requested
// It roughly doubles build time and isn't needed for `scratch-gui` development
// If you need non-production `dist/` for local dev, such as for `scratch-www` work, you can run something like:
// `BUILD_MODE=dist npm run build`
const buildDist = process.env.NODE_ENV === 'production' || process.env.BUILD_MODE === 'dist';

module.exports = buildDist ?
    [buildConfig.get(), distConfig.get()] :
    buildConfig.get();
