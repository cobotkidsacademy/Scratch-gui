import React from 'react';
import PropTypes from 'prop-types';
import {injectIntl, intlShape} from 'react-intl';
import styles from './admin.css';

// Import library JSON files directly
import spriteLibraryContent from '../../lib/libraries/sprites.json';
import backdropLibraryContent from '../../lib/libraries/backdrops.json';
import soundLibraryContent from '../../lib/libraries/sounds.json';

class Admin extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            activeTab: 'categories', // 'categories' or 'assets'
            categories: {
                sprite: [],
                backdrop: [],
                sound: []
            },
            assets: {
                sprite: [],
                backdrop: [],
                sound: []
            },
            selectedType: 'sprite',
            message: null,
            messageType: null
        };
    }

    componentDidMount() {
        this.loadLibraryData();
    }

    loadLibraryData = () => {
        // Extract categories from tags in library files
        const categories = {
            sprite: this.extractCategories(spriteLibraryContent, 'sprite'),
            backdrop: this.extractCategories(backdropLibraryContent, 'backdrop'),
            sound: this.extractCategories(soundLibraryContent, 'sound')
        };

        // Load assets from library files
        const assets = {
            sprite: this.processSprites(spriteLibraryContent),
            backdrop: this.processBackdrops(backdropLibraryContent),
            sound: this.processSounds(soundLibraryContent)
        };

        this.setState({categories, assets});
    }

    extractCategories = (libraryData, type) => {
        const categorySet = new Set();
        
        libraryData.forEach(item => {
            if (item.tags && Array.isArray(item.tags)) {
                item.tags.forEach(tag => {
                    // Capitalize first letter for display
                    const categoryName = tag.charAt(0).toUpperCase() + tag.slice(1);
                    categorySet.add(categoryName);
                });
            }
        });

        return Array.from(categorySet).sort().map((name, index) => ({
            id: index + 1,
            name: name,
            type: type
        }));
    }

    processSprites = (sprites) => {
        return sprites.map((sprite, index) => ({
            id: index + 1,
            name: sprite.name,
            type: 'sprite',
            tags: sprite.tags || [],
            md5ext: sprite.costumes && sprite.costumes[0] ? sprite.costumes[0].md5ext : null,
            dataFormat: sprite.costumes && sprite.costumes[0] ? sprite.costumes[0].dataFormat : null,
            category: sprite.tags && sprite.tags.length > 0 ? sprite.tags[0] : 'Uncategorized'
        }));
    }

    processBackdrops = (backdrops) => {
        return backdrops.map((backdrop, index) => ({
            id: index + 1,
            name: backdrop.name,
            type: 'backdrop',
            tags: backdrop.tags || [],
            md5ext: backdrop.md5ext,
            dataFormat: backdrop.dataFormat,
            category: backdrop.tags && backdrop.tags.length > 0 ? backdrop.tags[0] : 'Uncategorized'
        }));
    }

    processSounds = (sounds) => {
        return sounds.map((sound, index) => ({
            id: index + 1,
            name: sound.name,
            type: 'sound',
            tags: sound.tags || [],
            md5ext: sound.md5ext,
            dataFormat: sound.dataFormat || 'wav',
            category: sound.tags && sound.tags.length > 0 ? sound.tags[0] : 'Uncategorized'
        }));
    }

    showMessage = (message, type = 'info') => {
        this.setState({message, messageType: type});
        setTimeout(() => {
            this.setState({message: null, messageType: null});
        }, 5000);
    }

    filterAssetsByCategory = (assets, categoryName) => {
        if (!categoryName) return assets;
        return assets.filter(asset => 
            asset.tags && asset.tags.some(tag => 
                tag.toLowerCase() === categoryName.toLowerCase()
            )
        );
    }

    render() {
        const {
            activeTab,
            categories,
            assets,
            selectedType,
            message,
            messageType
        } = this.state;

        const filteredAssets = this.filterAssetsByCategory(assets[selectedType], null);

        return (
            <div className={styles.adminContainer}>
                <div className={styles.header}>
                    <h1>Scratch Library Admin</h1>
                    <p>View and manage categories and assets in Scratch library</p>
                    <p style={{fontSize: '12px', color: '#888', marginTop: '8px', fontStyle: 'italic'}}>
                        This admin page reads directly from the library JSON files. 
                        To modify assets, edit the JSON files: sprites.json, backdrops.json, sounds.json
                    </p>
                </div>

                {message && (
                    <div className={`${styles.message} ${styles[messageType]}`}>
                        {message}
                    </div>
                )}

                <div className={styles.tabs}>
                    <button
                        className={activeTab === 'categories' ? styles.active : ''}
                        onClick={() => this.setState({activeTab: 'categories'})}
                    >
                        Categories
                    </button>
                    <button
                        className={activeTab === 'assets' ? styles.active : ''}
                        onClick={() => this.setState({activeTab: 'assets'})}
                    >
                        Assets
                    </button>
                </div>

                <div className={styles.content}>
                    {activeTab === 'categories' && (
                        <div className={styles.categoriesTab}>
                            <div className={styles.section}>
                                <h2>Library Categories</h2>
                                <p className={styles.helpText}>
                                    Categories are automatically extracted from tags in the library JSON files.
                                    To add a category, add a tag to an asset in the library JSON files.
                                </p>
                            </div>

                            <div className={styles.section}>
                                {['sprite', 'backdrop', 'sound'].map(type => (
                                    <div key={type} className={styles.categoryList}>
                                        <h3>{type.charAt(0).toUpperCase() + type.slice(1)}s</h3>
                                        {categories[type].length === 0 ? (
                                            <p className={styles.empty}>No categories found</p>
                                        ) : (
                                            <ul>
                                                {categories[type].map(cat => (
                                                    <li key={cat.id}>
                                                        {cat.name} ({this.filterAssetsByCategory(assets[type], cat.name.toLowerCase()).length} assets)
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'assets' && (
                        <div className={styles.assetsTab}>
                            <div className={styles.section}>
                                <h2>Library Assets</h2>
                                <div className={styles.formGroup}>
                                    <label>Asset Type:</label>
                                    <select
                                        value={selectedType}
                                        onChange={(e) => this.setState({selectedType: e.target.value})}
                                    >
                                        <option value="sprite">Sprite</option>
                                        <option value="backdrop">Backdrop</option>
                                        <option value="sound">Sound</option>
                                    </select>
                                </div>
                                <p className={styles.helpText}>
                                    Showing {filteredAssets.length} {selectedType}(s) from the library.
                                    To add or modify assets, edit the library JSON files directly.
                                </p>
                            </div>

                            <div className={styles.section}>
                                <h2>Existing Assets</h2>
                                {filteredAssets.length === 0 ? (
                                    <p className={styles.empty}>No assets found</p>
                                ) : (
                                    <div className={styles.assetGrid}>
                                        {filteredAssets.slice(0, 50).map(asset => (
                                            <div key={asset.id} className={styles.assetCard}>
                                                <div className={styles.assetName}>{asset.name}</div>
                                                <div className={styles.assetInfo}>
                                                    Category: {asset.category}
                                                </div>
                                                {asset.md5ext && (
                                                    <div className={styles.assetInfo}>
                                                        File: {asset.md5ext}
                                                    </div>
                                                )}
                                                {asset.tags && asset.tags.length > 0 && (
                                                    <div className={styles.assetInfo}>
                                                        Tags: {asset.tags.join(', ')}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        {filteredAssets.length > 50 && (
                                            <p>... and {filteredAssets.length - 50} more</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }
}

Admin.propTypes = {
    intl: intlShape.isRequired
};

export default injectIntl(Admin);
