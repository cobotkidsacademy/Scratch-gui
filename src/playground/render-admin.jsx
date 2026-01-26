import React from 'react';
import ReactDOM from 'react-dom';
import {IntlProvider} from 'react-intl';

import Admin from '../components/admin/admin.jsx';

// Simple empty messages object for admin (admin doesn't use translations)
const emptyMessages = {};

/*
 * Render the Admin page. This is a separate function for the admin interface.
 * {object} appTarget - the DOM element to render to
 */
export default appTarget => {
    ReactDOM.render(
        <IntlProvider locale="en" messages={emptyMessages}>
            <Admin />
        </IntlProvider>,
        appTarget
    );
};
