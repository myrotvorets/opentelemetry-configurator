/** @type {import('mocha').MochaOptions} */
module.exports = {
    recursive: true,
    extension: ['.test.mts'],
    'node-option': ['loader=ts-node/esm', 'loader=testdouble', 'no-warnings'],
    require: 'mocha.setup.mjs',
    reporter: 'mocha-multi',
    'reporter-option': [
        'spec=-',
        process.env.GITHUB_ACTIONS === 'true' ? 'mocha-reporter-gha=-' : null,
        'mocha-reporter-sonarqube=test-report.xml'
    ].filter(Boolean),
}
