import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import {defineMessages, injectIntl, intlShape} from 'react-intl';
import VM from 'scratch-vm';

// Built-in backdrop library content - loaded directly from JSON file
// Assets are served as static files by webpack from static/assets/ directory
import backdropLibraryContent from '../lib/libraries/backdrops.json';
import backdropTags from '../lib/libraries/backdrop-tags';
import LibraryComponent from '../components/library/library.jsx';
import InstantDisplay from '../lib/instant-display.js';

const messages = defineMessages({
    libraryTitle: {
        defaultMessage: 'Choose a Backdrop',
        description: 'Heading for the backdrop library',
        id: 'gui.costumeLibrary.chooseABackdrop'
    }
});


class BackdropLibrary extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleItemSelect',
            'forceRendererUpdate'
        ]);
    }
    forceRendererUpdate () {
        // Simple: Force renderer to update
        const stage = this.props.vm.runtime.getTargetForStage();
        const renderer = this.props.vm.runtime.renderer;
        
        if (stage && renderer) {
            stage.updateAllDrawableProperties();
            renderer.draw();
            if (this.props.vm.emitTargetsUpdate) {
                this.props.vm.emitTargetsUpdate(false);
            }
        }
    }
    handleItemSelect (item) {
        const assetUrl = `/static/assets/images/${item.md5ext}`;
        const storage = this.props.vm.runtime.storage;
        
        // Set VM reference for asset injection
        if (storage.setVMReference) {
            storage.setVMReference(this.props.vm);
        }
        
        // Pre-load asset using instant-display library
        InstantDisplay.preloadAsset(storage, assetUrl, item.md5ext)
            .then(asset => {
                const [md5, ext] = item.md5ext.split('.');
                
                // Store in global map for cache lookup
                if (!window._backdropAssetMap) window._backdropAssetMap = new Map();
                window._backdropAssetMap.set(item.md5ext, asset);
                window._backdropAssetMap.set(md5, asset);
                window._backdropAssetMap.set(`${md5}.${ext}`, asset);
                window._backdropAssetMap.set(asset.assetId, asset);
                
                // Store in pending map for VM.addBackdrop interception
                if (!window._pendingBackdrops) window._pendingBackdrops = new Map();
                window._pendingBackdrops.set(md5, { asset, md5ext: item.md5ext, md5 });
                
                // Create backdrop object with asset
                const vmBackdrop = {
                    name: item.name,
                    md5: md5,
                    md5ext: item.md5ext,
                    asset: asset,
                    assetId: asset.assetId,
                    rotationCenterX: item.rotationCenterX,
                    rotationCenterY: item.rotationCenterY,
                    bitmapResolution: item.bitmapResolution,
                    skinId: null,
                    dataFormat: ext
                };
                
                // Add backdrop
                return this.props.vm.addBackdrop(item.md5ext, vmBackdrop);
            })
            .then(() => {
                // Use instant-display library for immediate rendering
                InstantDisplay.displayBackdropInstantly(this.props.vm);
            })
            .catch(error => {
                // Silent error - backdrop may still have been added
                const stage = this.props.vm.runtime.getTargetForStage();
                if (stage && stage.getCostumes().length > 0) {
                    InstantDisplay.displayBackdropInstantly(this.props.vm);
                }
            });
    }
    render () {
        return (
            <LibraryComponent
                data={backdropLibraryContent}
                id="backdropLibrary"
                tags={backdropTags}
                title={this.props.intl.formatMessage(messages.libraryTitle)}
                onItemSelected={this.handleItemSelect}
                onRequestClose={this.props.onRequestClose}
            />
        );
    }
}

BackdropLibrary.propTypes = {
    intl: intlShape.isRequired,
    onRequestClose: PropTypes.func,
    vm: PropTypes.instanceOf(VM).isRequired
};

export default injectIntl(BackdropLibrary);
