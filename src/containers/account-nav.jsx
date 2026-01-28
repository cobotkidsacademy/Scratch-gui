/*
NOTE: this file only temporarily resides in scratch-gui.
Nearly identical code appears in scratch-www, and the two should
eventually be consolidated.
*/

import {injectIntl} from 'react-intl';
import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import queryString from 'query-string';

import AccountNavComponent from '../components/menu-bar/account-nav.jsx';

class AccountNav extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            studentName: null,
            loading: false
        };
    }

    componentDidMount() {
        // Check for studentName or studentId in URL params
        // Priority: studentName from URL > session username
        const queryParams = queryString.parse(window.location.search);
        const studentName = queryParams.studentName;
        const studentId = queryParams.studentId;
        
        if (studentName) {
            // Always use studentName from URL params if available (highest priority)
            this.setState({ studentName: decodeURIComponent(studentName) });
        } else if (studentId) {
            // Fallback: use studentId if studentName not provided
            this.setState({ studentName: `Student ${studentId.substring(0, 8)}` });
        }
    }

    render() {
        const {
            ...componentProps
        } = this.props;
        
        // Use student name if available, otherwise use username from session
        const displayName = this.state.studentName || componentProps.username || '';
        
        return (
            <AccountNavComponent
                {...componentProps}
                username={displayName}
            />
        );
    }
}

AccountNav.propTypes = {
    classroomId: PropTypes.string,
    isEducator: PropTypes.bool,
    isRtl: PropTypes.bool,
    isStudent: PropTypes.bool,
    profileUrl: PropTypes.string,
    thumbnailUrl: PropTypes.string,
    username: PropTypes.string
};

const mapStateToProps = state => ({
    classroomId: state.session && state.session.session && state.session.session.user ?
        state.session.session.user.classroomId : '',
    isEducator: state.session && state.session.permissions && state.session.permissions.educator,
    isStudent: state.session && state.session.permissions && state.session.permissions.student,
    profileUrl: state.session && state.session.session && state.session.session.user ?
        `/users/${state.session.session.user.username}` : '',
    thumbnailUrl: state.session && state.session.session && state.session.session.user ?
        state.session.session.user.thumbnailUrl : null,
    username: state.session && state.session.session && state.session.session.user ?
        state.session.session.user.username : ''
});

const mapDispatchToProps = () => ({});

export default injectIntl(connect(
    mapStateToProps,
    mapDispatchToProps
)(AccountNav));
