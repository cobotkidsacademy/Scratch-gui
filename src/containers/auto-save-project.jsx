import React from 'react';
import {connect} from 'react-redux';
import bindAll from 'lodash.bindall';
import queryString from 'query-string';

/**
 * AutoSaveProject - Seamless Auto-Save Implementation
 * 
 * Implements Tinkercad-like seamless auto-saving with:
 * - Debounced saves (3 seconds after last change)
 * - Periodic backup saves (every 30 seconds)
 * - Request cancellation to prevent stale saves
 * - Background processing (non-blocking)
 * - Optimized serialization
 * - Silent error handling
 * 
 * This component renders nothing; it just runs in the background.
 */
class AutoSaveProject extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'scheduleSave',
            'performSave',
            'handleBeforeUnload',
            'handleVMChange'
        ]);

        // Save scheduling
        this.debounceTimer = null;
        this.periodicTimer = null;
        this.lastSaveTime = 0;
        this.pendingSaveAbortController = null;
        
        // State tracking
        this.isSaving = false;
        this.saveQueue = null; // Only one queued save at a time
        this.lastProjectHash = null;
        
        // Configuration
        this.DEBOUNCE_DELAY = 4000; // 4 seconds after last change
        this.PERIODIC_INTERVAL = 30000; // 30 seconds periodic backup
        this.MIN_SAVE_INTERVAL = 5000; // Minimum 5 seconds between saves
        this.TOPIC_CACHE_TTL = 300000; // Cache topic name for 5 minutes
        
        // Cached data
        this.cachedTopicName = null;
        this.topicCacheTime = 0;
        this.apiConfig = null;
        this.currentProjectId = null; // Track the current project ID for versioning
    }

    componentDidMount () {
        if (typeof window === 'undefined' || !this.props.vm) return;

        // Parse and cache API configuration
        this.initializeApiConfig();

        // Load existing project ID from URL params (when opening saved project) or sessionStorage
        if (typeof window !== 'undefined') {
            const queryParams = queryString.parse(window.location.search);
            
            // Check URL for savedProjectId or projectId (from portfolio view)
            const savedProjectId = queryParams.savedProjectId || queryParams.projectId;
            if (savedProjectId) {
                this.currentProjectId = savedProjectId;
                // Also store in sessionStorage for persistence
                if (window.sessionStorage && this.apiConfig) {
                    const storageKey = `project_id_${this.apiConfig.studentId}_${this.apiConfig.topicId}`;
                    window.sessionStorage.setItem(storageKey, savedProjectId);
                }
            } else if (window.sessionStorage && this.apiConfig) {
                // Fallback to sessionStorage if not in URL
                const storageKey = `project_id_${this.apiConfig.studentId}_${this.apiConfig.topicId}`;
                const storedProjectId = window.sessionStorage.getItem(storageKey);
                if (storedProjectId) {
                    this.currentProjectId = storedProjectId;
                }
            }
        }

        // Fetch topic name from API
        this.fetchTopicName().then(() => {
            // Initial save after topic name is loaded
            this.scheduleSave(true);
        });

        // If we opened a saved project, load the sb3 into the VM once
        try {
            const queryParams = queryString.parse(window.location.search);
            const shouldLoad = queryParams.loadSavedProject === 'true' || queryParams.loadSavedProject === true;
            const projectId = queryParams.savedProjectId || queryParams.projectId;

            if (shouldLoad && projectId && window.sessionStorage) {
                const storageKey = `saved_project_${projectId}`;
                const raw = window.sessionStorage.getItem(storageKey);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    const sb3Base64 = parsed?.sb3Base64;

                    if (sb3Base64 && typeof sb3Base64 === 'string') {
                        // Decode base64 -> ArrayBuffer
                        const binary = window.atob(sb3Base64);
                        const len = binary.length;
                        const bytes = new Uint8Array(len);
                        for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);

                        // Load into VM (same as uploading an .sb3)
                        this.props.vm.loadProject(bytes.buffer).then(() => {
                            console.log('[AutoSave] Loaded saved .sb3 into VM:', projectId);
                            // Mark project id for subsequent autosaves
                            this.currentProjectId = projectId;
                        }).catch((e) => {
                            console.error('[AutoSave] Failed to load saved .sb3 into VM:', e);
                        });
                    }
                }
            }
        } catch (e) {
            // ignore load errors
        }

        // Listen to VM changes for debounced saves
        this.setupVMListeners();

        // Periodic backup saves (independent of user activity)
        this.periodicTimer = window.setInterval(() => {
            this.scheduleSave(false);
        }, this.PERIODIC_INTERVAL);

        // Save on tab close / refresh
        window.addEventListener('beforeunload', this.handleBeforeUnload);
        
        // Save on visibility change (tab switch)
        document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }

    componentWillUnmount () {
        // Cancel any pending saves
        if (this.pendingSaveAbortController) {
            this.pendingSaveAbortController.abort();
        }
        
        // Clear timers
        if (this.debounceTimer) {
            window.clearTimeout(this.debounceTimer);
        }
        if (this.periodicTimer) {
            window.clearInterval(this.periodicTimer);
        }
        
        // Remove listeners
        if (typeof window !== 'undefined') {
            window.removeEventListener('beforeunload', this.handleBeforeUnload);
            document.removeEventListener('visibilitychange', this.handleVisibilityChange);
        }
        
        // Clean up VM listeners
        this.cleanupVMListeners();
    }

    initializeApiConfig () {
        const queryParams = queryString.parse(window.location.search);
        
        // Get student ID
        const studentId = queryParams.studentId || queryParams.student_id || null;
        
        // Get topic/course info
        const topicId = queryParams.topicId || queryParams.topic_id;
        const courseId = queryParams.courseId || queryParams.course_id;
        const levelId = queryParams.levelId || queryParams.level_id;
        
        // Get auth token
        let token = null;
        const tokenParam = queryParams.authToken;
        if (typeof tokenParam === 'string' && tokenParam) {
            token = tokenParam;
        } else if (window.localStorage) {
            token = window.localStorage.getItem('student_token');
        }
        
        // Determine backend base URL
        let apiBase = queryParams.apiBase || '';
        if (!apiBase) {
            const {protocol, hostname, port} = window.location;
            if ((hostname === 'localhost' || hostname === '127.0.0.1') && port === '8601') {
                apiBase = `${protocol}//${hostname}:3001`;
            } else {
                apiBase = `${protocol}//${hostname}${port ? `:${port}` : ''}`;
            }
        }
        
        this.apiConfig = {
            studentId,
            topicId,
            courseId,
            levelId,
            token,
            apiBase: apiBase.replace(/\/$/, ''),
            saveUrl: `${apiBase.replace(/\/$/, '')}/student-courses/save-project`
        };
    }

    async fetchTopicName () {
        if (!this.apiConfig || !this.apiConfig.topicId) return;
        
        // Check cache first
        const now = Date.now();
        if (this.cachedTopicName && (now - this.topicCacheTime) < this.TOPIC_CACHE_TTL) {
            return this.cachedTopicName;
        }
        
        try {
            // Fetch topic details from API
            const topicUrl = `${this.apiConfig.apiBase}/student-courses/topic/${this.apiConfig.topicId}/details`;
            const headers = {
                'Content-Type': 'application/json'
            };
            if (this.apiConfig.token) {
                headers.Authorization = `Bearer ${this.apiConfig.token}`;
            }
            
            const response = await window.fetch(topicUrl, {
                method: 'GET',
                headers
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data && data.name) {
                    this.cachedTopicName = data.name;
                    this.topicCacheTime = now;
                    return this.cachedTopicName;
                }
            }
        } catch (e) {
            // Silent failure - use fallback
        }
        
        // Fallback: use topicName from URL params or project title
        const queryParams = queryString.parse(window.location.search);
        const topicNameFromUrl = queryParams.topicName;
        this.cachedTopicName = topicNameFromUrl 
            ? decodeURIComponent(topicNameFromUrl) 
            : (this.props.projectTitle || 'My Project');
        this.topicCacheTime = now;
    }

    setupVMListeners () {
        if (!this.props.vm || !this.props.vm.runtime) return;
        
        // Listen to project changes
        const runtime = this.props.vm.runtime;
        
        // Hook into various VM events that indicate project changes
        if (runtime.on) {
            // Project changed events
            runtime.on('PROJECT_CHANGED', this.handleVMChange);
            runtime.on('targetsUpdate', this.handleVMChange);
            
            // Block/script changes
            if (runtime.vm) {
                const vm = runtime.vm;
                if (vm.on) {
                    vm.on('workspaceUpdate', this.handleVMChange);
                }
            }
        }
        
        // Also listen to Redux state changes for project modifications
        // This will be handled via componentDidUpdate if needed
    }

    cleanupVMListeners () {
        if (!this.props.vm || !this.props.vm.runtime) return;
        
        const runtime = this.props.vm.runtime;
        if (runtime.off) {
            runtime.off('PROJECT_CHANGED', this.handleVMChange);
            runtime.off('targetsUpdate', this.handleVMChange);
            
            if (runtime.vm && runtime.vm.off) {
                runtime.vm.off('workspaceUpdate', this.handleVMChange);
            }
        }
    }

    handleVMChange () {
        // Debounced save on VM changes
        this.scheduleSave(true);
    }

    handleVisibilityChange = () => {
        // Save when tab becomes hidden (user switches tabs)
        if (document.hidden) {
            this.scheduleSave(false);
        }
    }

    handleBeforeUnload () {
        // Cancel debounce and save immediately
        if (this.debounceTimer) {
            window.clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
        
        // Perform synchronous save attempt (fire-and-forget)
        try {
            this.performSave(true);
        } catch (e) {
            // Ignore errors on unload
        }
    }

    scheduleSave (isDebounced = false) {
        if (!this.apiConfig || !this.apiConfig.topicId || !this.apiConfig.studentId) {
            return; // Can't save without required info
        }
        
        // Ensure VM is available and ready
        if (!this.props.vm || !this.props.vm.runtime) {
            console.warn('[AutoSave] VM not ready, skipping save');
            return;
        }
        
        // Cancel previous debounce if this is a new debounced save
        if (isDebounced && this.debounceTimer) {
            window.clearTimeout(this.debounceTimer);
        }
        
        // Check minimum interval
        const now = Date.now();
        if (!isDebounced && (now - this.lastSaveTime) < this.MIN_SAVE_INTERVAL) {
            return; // Too soon since last save
        }
        
        // Schedule the save
        if (isDebounced) {
            // Debounced: wait for user to stop making changes
            this.debounceTimer = window.setTimeout(() => {
                this.debounceTimer = null;
                this.performSave(false);
            }, this.DEBOUNCE_DELAY);
        } else {
            // Immediate: use requestIdleCallback for non-blocking save
            if (window.requestIdleCallback) {
                window.requestIdleCallback(() => {
                    this.performSave(false);
                }, { timeout: 2000 });
            } else {
                // Fallback for browsers without requestIdleCallback
                window.setTimeout(() => {
                    this.performSave(false);
                }, 0);
            }
        }
    }

    async performSave (isFinal = false) {
        // Prevent concurrent saves
        if (this.isSaving) {
            this.saveQueue = true; // Queue another save
            return;
        }
        
        // Cancel any pending save request
        if (this.pendingSaveAbortController) {
            this.pendingSaveAbortController.abort();
        }
        
        // Create new abort controller for this save
        this.pendingSaveAbortController = new AbortController();
        const signal = this.pendingSaveAbortController.signal;
        
        this.isSaving = true;
        this.lastSaveTime = Date.now();
        
        try {
            // Ensure we have topic name
            await this.fetchTopicName();
            
            // Use requestIdleCallback or setTimeout(0) to serialize in background
            const serializationPromise = new Promise((resolve, reject) => {
                const serialize = () => {
                    try {
                        if (!this.props.vm) {
                            console.error('[AutoSave] VM not available');
                            reject(new Error('VM not available'));
                            return;
                        }
                        
                        if (!this.props.vm.saveProjectSb3) {
                            console.error('[AutoSave] saveProjectSb3 method not available on VM');
                            reject(new Error('saveProjectSb3 method not available'));
                            return;
                        }
                        
                        // Serialize project (this can be heavy, so we do it in background)
                        // saveProjectSb3 can return Blob (default) or ArrayBuffer if 'arraybuffer' is specified
                        // We'll request ArrayBuffer format for easier conversion to base64
                        const savePromise = this.props.vm.saveProjectSb3('arraybuffer');
                        if (!savePromise || typeof savePromise.then !== 'function') {
                            console.error('[AutoSave] saveProjectSb3 did not return a promise');
                            reject(new Error('saveProjectSb3 did not return a promise'));
                            return;
                        }
                        
                        savePromise.then((result) => {
                            if (!result) {
                                console.error('[AutoSave] saveProjectSb3 returned null/undefined');
                                reject(new Error('saveProjectSb3 returned empty result'));
                                return;
                            }
                            resolve(result);
                        }).catch(reject);
                    } catch (e) {
                        console.error('[AutoSave] Error during serialization:', e);
                        reject(e);
                    }
                };
                
                // Use idle callback for non-blocking serialization
                if (window.requestIdleCallback) {
                    window.requestIdleCallback(serialize, { timeout: 5000 });
                } else {
                    window.setTimeout(serialize, 0);
                }
            });
            
            const content = await serializationPromise;
            
            // Verify we got content
            if (!content) {
                console.error('[AutoSave] Serialization returned empty content');
                throw new Error('Serialization returned empty content');
            }
            
            // Log content type for debugging
            if (content instanceof ArrayBuffer) {
                console.log('[AutoSave] Got ArrayBuffer, size:', content.byteLength);
            } else if (content instanceof Blob) {
                console.log('[AutoSave] Got Blob, size:', content.size);
            } else {
                console.log('[AutoSave] Got content type:', typeof content, 'length:', content?.length);
            }
            
            // Check if save was aborted
            if (signal.aborted) {
                this.isSaving = false;
                return;
            }
            
            // Convert to base64 (also in background)
            const sb3Base64 = await this.convertToBase64(content);
            
            if (signal.aborted) {
                this.isSaving = false;
                return;
            }
            
            // Validate base64 content
            if (!sb3Base64 || sb3Base64.length === 0) {
                console.error('[AutoSave] Base64 conversion resulted in empty string');
                throw new Error('Base64 conversion failed');
            }
            
            // Validate required fields before saving
            if (!this.apiConfig.topicId || !this.apiConfig.courseId || !this.apiConfig.levelId) {
                console.error('[AutoSave] Missing required fields:', {
                    topicId: this.apiConfig.topicId,
                    courseId: this.apiConfig.courseId,
                    levelId: this.apiConfig.levelId
                });
                return;
            }
            
            // Prepare save payload
            const body = {
                project_id: this.currentProjectId || undefined, // Include project ID if we have one
                topic_id: this.apiConfig.topicId,
                course_level_id: this.apiConfig.levelId,
                course_id: this.apiConfig.courseId,
                project_name: this.cachedTopicName || this.props.projectTitle || 'My Project',
                project_title: this.props.projectTitle || this.cachedTopicName || 'My Project',
                editor_type: 'inter',
                editor_url: window.location.origin + window.location.pathname + window.location.search,
                project_data: {
                    sb3Base64
                },
                project_type: 'scratch',
                file_format: 'sb3',
                is_autosaved: !isFinal
            };
            
            console.log('[AutoSave] Saving project:', {
                projectId: this.currentProjectId,
                topicId: this.apiConfig.topicId,
                dataSize: sb3Base64.length,
                hasData: !!sb3Base64
            });
            
            const headers = {
                'Content-Type': 'application/json'
            };
            if (this.apiConfig.token) {
                headers.Authorization = `Bearer ${this.apiConfig.token}`;
            }
            
            // Perform save request with timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            
            try {
                const response = await window.fetch(this.apiConfig.saveUrl, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(body),
                    signal: signal.aborted ? controller.signal : signal // Use combined signal
                });
                
                clearTimeout(timeoutId);
                
                if (response.ok && !signal.aborted && !controller.signal.aborted) {
                    // Save was successful - store the project ID for future updates
                    try {
                        const responseData = await response.json();
                        if (responseData && responseData.id) {
                            this.currentProjectId = responseData.id;
                            // Store in sessionStorage for persistence across page reloads
                            if (window.sessionStorage) {
                                const storageKey = `project_id_${this.apiConfig.studentId}_${this.apiConfig.topicId}`;
                                window.sessionStorage.setItem(storageKey, responseData.id);
                            }
                        }
                    } catch (parseError) {
                        // Failed to parse response, but save might have succeeded
                    }
                } else if (!response.ok && !signal.aborted && !controller.signal.aborted) {
                    // Check if it's a 404 - might indicate route not found
                    if (response.status === 404) {
                        // Route might not be registered - this is a configuration issue
                        // Don't spam the console, but we could log once
                    }
                }
            } catch (fetchError) {
                clearTimeout(timeoutId);
                if (fetchError.name === 'AbortError') {
                    // Timeout or cancellation - expected
                }
                // Other errors are silently ignored
            }
            
        } catch (error) {
            // Error handling - log errors for debugging
            if (error.name !== 'AbortError') {
                console.error('[AutoSave] Save failed:', error);
            }
        } finally {
            this.isSaving = false;
            this.pendingSaveAbortController = null;
            
            // Process queued save if any
            if (this.saveQueue) {
                this.saveQueue = false;
                // Schedule next save after a short delay
                window.setTimeout(() => {
                    this.scheduleSave(false);
                }, 1000);
            }
        }
    }

    convertToBase64 (content) {
        return new Promise((resolve, reject) => {
            // Use setTimeout to convert in background
            window.setTimeout(async () => {
                try {
                    let uint8;
                    
                    // Handle different content types
                    if (content instanceof ArrayBuffer) {
                        uint8 = new Uint8Array(content);
                    } else if (content instanceof Blob) {
                        // Convert Blob to ArrayBuffer first
                        const arrayBuffer = await content.arrayBuffer();
                        uint8 = new Uint8Array(arrayBuffer);
                    } else if (content && content.buffer instanceof ArrayBuffer) {
                        uint8 = new Uint8Array(content.buffer);
                    } else if (typeof content === 'string') {
                        // If it's already a string (base64), return as is
                        resolve(content);
                        return;
                    } else {
                        console.error('[AutoSave] Unknown content type:', typeof content, content);
                        reject(new Error('Unknown content type for base64 conversion'));
                        return;
                    }
                    
                    if (uint8.length === 0) {
                        console.error('[AutoSave] Content is empty after conversion');
                        reject(new Error('Content is empty'));
                        return;
                    }
                    
                    let binary = '';
                    const chunkSize = 8192; // Process in chunks to avoid blocking
                    for (let i = 0; i < uint8.length; i += chunkSize) {
                        const chunk = uint8.slice(i, i + chunkSize);
                        for (let j = 0; j < chunk.length; j++) {
                            binary += String.fromCharCode(chunk[j]);
                        }
                    }
                    
                    const sb3Base64 = window.btoa(binary);
                    console.log('[AutoSave] Converted to base64, length:', sb3Base64.length);
                    resolve(sb3Base64);
                } catch (e) {
                    console.error('[AutoSave] Error converting to base64:', e);
                    reject(e);
                }
            }, 0);
        });
    }

    render () {
        // This component does not render any UI
        return null;
    }
}

AutoSaveProject.propTypes = {
    // vm and projectTitle are provided by Redux
};

const mapStateToProps = state => ({
    vm: state.scratchGui.vm,
    projectTitle: state.scratchGui.projectTitle
});

const mapDispatchToProps = () => ({});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(AutoSaveProject);
