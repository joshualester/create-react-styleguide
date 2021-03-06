import React from 'react';
import { ThemeProvider } from 'styled-components';
import theme from '../../src/themes';

export default props => <ThemeProvider {...props} theme={theme} />;
