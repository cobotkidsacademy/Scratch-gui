import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import VM from 'scratch-vm';
import {connect} from 'react-redux';
import queryString from 'query-string';

import ControlsComponent from '../components/controls/controls.jsx';

class Controls extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleGreenFlagClick',
            'handleStopAllClick',
            'broadcastGreenFlagToBackend'
        ]);
        
        // Initialize API config for green flag broadcast
        this.initializeApiConfig();
    }
    
    initializeApiConfig () {
        const queryParams = queryString.parse(window.location.search);
        
        // Get student ID and topic info
        const studentId = queryParams.studentId || queryParams.student_id;
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
            broadcastUrl: `${apiBase.replace(/\/$/, '')}/student-courses/broadcast-green-flag`
        };
    }
    
    async broadcastGreenFlagToBackend () {
        // Only broadcast if we have the required config and editor is internal
        if (!this.apiConfig || !this.apiConfig.studentId || !this.apiConfig.topicId) {
            return;
        }
        
        try {
            const headers = {
                'Content-Type': 'application/json'
            };
            if (this.apiConfig.token) {
                headers.Authorization = `Bearer ${this.apiConfig.token}`;
            }
            
            const body = {
                student_id: this.apiConfig.studentId,
                topic_id: this.apiConfig.topicId,
                course_id: this.apiConfig.courseId,
                course_level_id: this.apiConfig.levelId,
                action: 'green_flag_clicked',
                timestamp: new Date().toISOString()
            };
            
            // Fire-and-forget broadcast (don't block UI)
            window.fetch(this.apiConfig.broadcastUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify(body)
            }).catch(() => {
                // Silent failure - don't disturb user
            });
        } catch (e) {
            // Silent failure
        }
    }
    
    handleGreenFlagClick (e) {
        e.preventDefault();
        if (e.shiftKey) {
            this.props.vm.setTurboMode(!this.props.turbo);
        } else {
            if (!this.props.isStarted) {
                this.props.vm.start();
            }
            this.props.vm.greenFlag();
            
            // Broadcast to backend (non-blocking)
            this.broadcastGreenFlagToBackend();
        }
    }
    handleStopAllClick (e) {
        e.preventDefault();
        this.props.vm.stopAll();
    }
    render () {
        const {
            vm, // eslint-disable-line no-unused-vars
            isStarted, // eslint-disable-line no-unused-vars
            projectRunning,
            turbo,
            ...props
        } = this.props;
        return (
            <ControlsComponent
                {...props}
                active={projectRunning}
                turbo={turbo}
                onGreenFlagClick={this.handleGreenFlagClick}
                onStopAllClick={this.handleStopAllClick}
            />
        );
    }
}

Controls.propTypes = {
    isStarted: PropTypes.bool.isRequired,
    projectRunning: PropTypes.bool.isRequired,
    turbo: PropTypes.bool.isRequired,
    vm: PropTypes.instanceOf(VM)
};

const mapStateToProps = state => ({
    isStarted: state.scratchGui.vmStatus.running,
    projectRunning: state.scratchGui.vmStatus.running,
    turbo: state.scratchGui.vmStatus.turbo
});
// no-op function to prevent dispatch prop being passed to component
const mapDispatchToProps = () => ({});

export default connect(mapStateToProps, mapDispatchToProps)(Controls);
