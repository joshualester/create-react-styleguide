/**
 * This is a fork of nwb's createProject to support a new react styleguide template.
 * https://github.com/insin/nwb/blob/v0.22.0/src/createProject.js
 */

import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import copyTemplateDir from 'copy-template-dir';
import runSeries from 'run-series';
import { getNpmModulePrefs } from 'nwb/lib/createProject';
import { install, toSource, directoryExists } from 'nwb/lib/utils';
import pkg from '../../../package.json';

const CONFIG_FILE_NAME = 'nwb.config.js';

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
            console.log(`  ${chalk.green('create')} ${relativePath}`);
        });
        cb();
    });
}

/**
 * Initialise a Git repository if the user has Git, unless there's already one
 * present or the user has asked us could we not.
 */
function initGit(args, cwd, cb) {
    // Allow git init to be disabled with a --no-git flag
    if (args.git === false) {
        process.nextTick(cb);
        return;
    }
    // Bail if a git repo already exists (e.g. nwb init in an existing repo)
    if (directoryExists(path.join(cwd, '.git'))) {
        process.nextTick(cb);
        return;
    }

    exec('git --version', { cwd, stdio: 'ignore' }, err => {
        if (err) {
            cb();
            return;
        }
        const spinner = ora('Initing Git repo').start();
        runSeries(
            [
                callback => exec('git init', { cwd }, callback),
                callback => exec('git add .', { cwd }, callback),
                callback =>
                    exec(
                        `git commit -m "Initial commit from create-react-styleguide v${
                            pkg.version
                        }"`,
                        { cwd },
                        callback
                    ),
            ],
            error => {
                if (error) {
                    spinner.fail();
                    console.log(chalk.red(error.message));
                    cb();
                    return;
                }
                spinner.succeed();
                cb();
            }
        );
    });
}

/**
 * Write an nwb config file.
 */
function writeConfigFile(dir, config, cb) {
    fs.writeFile(path.join(dir, CONFIG_FILE_NAME), `module.exports = ${toSource(config)}\n`, cb);
}

/**
 * Create an npm module project skeleton.
 */
function createModuleProject(args, name, targetDir, cb) {
    let devDependencies = ['react', 'react-dom', 'create-react-styleguide'];
    const externals = { react: 'React' };
    const projectType = 'react-component';

    getNpmModulePrefs(args, (err, prefs) => {
        if (err) {
            cb(err);
            return;
        }
        const { umd, esModules } = prefs;
        const templateDir = path.join(__dirname, '../../../templates/react-styleguide');
        const templateVars = {
            name,
            esModules,
            esModulesPackageConfig: esModules ? '\n  "module": "es/index.js",' : '',
            createReactStyleguideVersion: pkg.version,
        };
        const nwbConfig = {
            type: projectType,
            npm: {
                esModules,
                umd: umd ? { global: umd, externals } : false,
            },
        };

        // CBA making this part generic until it's needed
        if (args.react) {
            devDependencies = devDependencies.map(depPkg => `${depPkg}@${args.react}`);
            templateVars.reactPeerVersion = `^${args.react}`; // YOLO
        } else {
            // TODO Get from npm so we don't have to manually update on major releases
            templateVars.reactPeerVersion = '16.x';
        }

        runSeries(
            [
                callback => copyTemplate(templateDir, targetDir, templateVars, callback),
                callback => writeConfigFile(targetDir, nwbConfig, callback),
                callback =>
                    install(devDependencies, { cwd: targetDir, save: true, dev: true }, callback),
                callback => initGit(args, targetDir, callback),
            ],
            cb
        );
    });
}

export default (argv, callback) => {
    // Translate argv into args for createModuleProject
    const args = {};

    createModuleProject(args, argv.projectDirectory, argv.projectDirectory, callback);
};
