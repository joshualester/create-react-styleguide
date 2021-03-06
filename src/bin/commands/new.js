/**
 * This is a fork of nwb's createProject to support a new react styleguide template.
 * https://github.com/insin/nwb/blob/v0.22.0/src/createProject.js
 */
import path from 'path';
import chalk from 'chalk';
import copyTemplateDir from 'copy-template-dir';
import runSeries from 'run-series';
import install from '../util/install';
import pkg from '../../../package.json';
import { initGit, initialCommit } from '../util/git';

const STABLE_VERSIONS = {
    // dependencies
    'prop-types': '15.6.2',
    'styled-components': '4.0.2',
    emotion: '9.2.12',
    'react-emotion': '9.2.12',
    'emotion-theming': '9.2.9',
    // devDependencies
    react: '16.5.2',
    'react-dom': '16.5.2',
    'babel-preset-zillow': '1.0.0',
    husky: '1.1.2',
    enzyme: '3.7.0',
    'enzyme-to-json': '3.3.4',
    'eslint-plugin-zillow': '1.0.0',
    'eslint-plugin-jest': '21.25.1',
    'babel-plugin-styled-components': '1.8.0',
    'jest-styled-components': '6.2.2',
    'babel-plugin-emotion': '9.2.11',
    'jest-emotion': '9.2.11',
    'enzyme-adapter-react-16': '1.6.0',
    // Always use the latest version of create-react-styleguide
    'create-react-styleguide': '',
};

/**
 * Copy a project template and log created files if successful.
 */
function copyTemplate(templateDir, targetDir, templateVars, cb) {
    copyTemplateDir(templateDir, targetDir, templateVars, (err, createdFiles) => {
        if (err) {
            cb(err);
            return;
        }
        createdFiles.sort().forEach(createdFile => {
            const relativePath = path.relative(targetDir, createdFile);
            // eslint-disable-next-line no-console
            console.log(`  ${chalk.green('create')} ${relativePath}`);
        });
        cb();
    });
}

/**
 * Create an npm module project skeleton.
 */
function createModuleProject(args, name, targetDir, cb) {
    let devDependencies = [
        'react',
        'react-dom',
        'create-react-styleguide',
        'babel-preset-zillow',
        'husky',
        'enzyme',
        'enzyme-to-json',
    ];
    if (args.eslint === 'zillow') {
        devDependencies.push('eslint-plugin-zillow', 'eslint-plugin-jest');
    }

    let dependencies = ['prop-types'];
    if (args.styles === 'styled-components') {
        dependencies.push('styled-components');
        devDependencies.push('babel-plugin-styled-components', 'jest-styled-components');
    } else if (args.styles === 'emotion') {
        dependencies.push('emotion', 'react-emotion', 'emotion-theming');
        devDependencies.push('babel-plugin-emotion', 'jest-emotion');
    }

    let templateDir = path.join(__dirname, '../../../templates/inline-styles');
    if (args.styles === 'styled-components') {
        templateDir = path.join(__dirname, '../../../templates/styled-components-styles');
    } else if (args.styles === 'emotion') {
        templateDir = path.join(__dirname, '../../../templates/emotion-styles');
    }

    const templateVars = {
        name,
        eslintPackageConfig:
            args.eslint === 'zillow'
                ? '\n    "eslint": "create-react-styleguide script eslint",\n    "eslint:fix": "create-react-styleguide script eslint:fix",'
                : '',
        createReactStyleguideVersion: pkg.version,
        huskyConfig: args.eslint === 'zillow' ? 'npm run eslint && npm run test' : 'npm run test',
    };

    // TODO Get from npm so we don't have to manually update on major releases
    templateVars.reactPeerVersion = '16.x';
    devDependencies.push('enzyme-adapter-react-16');

    let copyEslintTemplate = callback => callback();
    if (args.eslint === 'zillow') {
        const eslintTemplateDir = path.join(__dirname, '../../../templates/zillow-eslint');
        copyEslintTemplate = callback =>
            copyTemplate(eslintTemplateDir, targetDir, templateVars, callback);
    }

    // By default, the latest version of all dependencies are installed.
    // If for some reason that fails, we can fall back to a previously known stable release.
    if (args.stable) {
        const versionMap = dep => {
            const version = STABLE_VERSIONS[dep];
            if (version) {
                return `${dep}@${version}`;
            }
            return dep;
        };
        devDependencies = devDependencies.map(versionMap);
        dependencies = dependencies.map(versionMap);
    }

    runSeries(
        [
            callback => copyTemplate(templateDir, targetDir, templateVars, callback),
            copyEslintTemplate,
            callback => initGit(args, targetDir, callback),
            callback =>
                install(devDependencies, { cwd: targetDir, save: true, dev: true }, callback),
            callback => install(dependencies, { cwd: targetDir, save: true, dev: false }, callback),
            callback => initialCommit(args, targetDir, callback),
        ],
        cb
    );
}

export default (argv, callback) => {
    createModuleProject(argv, argv.projectDirectory, argv.projectDirectory, callback);
};
