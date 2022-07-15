# Starter Projects

## Development

### Copying a starter project

1. Create a new public repository for your project (e.g. `new-repository`)
2. Create a clone of the starter repo
    ```
    git clone --single-branch https://github.com/concord-consortium/starter-projects.git new-repository
    ```
3. Update the starter repo

    First, update and run the starter project:
    ```
    cd new-repository
    npm install
    npm update
    npm start
    ```
    Then, verify the project works by visiting [localhost:8080](http://localhost:8080) and checking for the words "Hello World".
    Also verify that the test suite still passes:
    ```
    npm run test:full
    ```
    If the updates are functional, please commit any changes to `package.json` or `package-lock.json` back to the
    Starter Projects repository for future use.

4. Next, re-initialize the repo to create a new history
    ```
    rm -rf .git
    git init
    ```
5. Create an initial commit for your new project
    ```
    git add .
    git commit -m "Initial commit"
    ```
6. Push to your new repository
    ```
    git remote add origin https://github.com/concord-consortium/new-repository.git
    git push -u origin master
    ```
7. Open your new repository and update all instances of `starter-projects` to `new-repository` and `Starter Projects` to `New Repository`.
   Note: this will do some of the configuration for GitHub Actions deployment to S3, but you'll still need to follow
   the instructions [here](https://docs.google.com/document/d/e/2PACX-1vTpYjbGmUMxk_FswUmapK_RzVyEtm1WdnFcNByp9mqwHnp0nR_EzRUOiubuUCsGwzQgOnut_UiabYOM/pub).
8. To record the cypress tests results to the cypress dashboard service:
   - go to https://dashboard.cypress.io
   - create a new project
   - go to the settings for the project
   - in the github integration section choose the github repo to connect this project to
   - copy the record key, and create a secret in the github repositories settings with the name CYPRESS_RECORD_KEY
   - copy the Project ID and replace the value of `projectId` in cypress.json
9. Your new repository is ready! Remove this section of the `README`, and follow the steps below to use it.

### Initial steps

1. Clone this repo and `cd` into it
2. Run `npm install` to pull dependencies
3. Run `npm start` to run `webpack-dev-server` in development mode with hot module replacement

#### Run using HTTPS

Additional steps are required to run using HTTPS.

1. install [mkcert](https://github.com/FiloSottile/mkcert) : `brew install mkcert` (install using Scoop or Chocolatey on Windows)
2. Create and install the trusted CA in keychain if it doesn't already exist:   `mkcert -install`
3. Ensure you have a `.localhost-ssl` certificate directory in your home directory (create if needed, typically `C:\Users\UserName` on Windows) and cd into that directory
4. Make the cert files: `mkcert -cert-file localhost.pem -key-file localhost.key localhost 127.0.0.1 ::1`
5. Run `npm run start:secure` to run `webpack-dev-server` in development mode with hot module replacement

Alternately, you can run secure without certificates in Chrome:
1. Enter `chrome://flags/#allow-insecure-localhost` in Chrome URL bar
2. Change flag from disabled to enabled
3. Run `npm run start:secure:no-certs` to run `webpack-dev-server` in development mode with hot module replacement

### Building

If you want to build a local version run `npm build`, it will create the files in the `dist` folder.
You *do not* need to build to deploy the code, that is automatic.  See more info in the Deployment section below.

### Notes

1. Make sure if you are using Visual Studio Code that you use the workspace version of TypeScript.
   To ensure that you are open a TypeScript file in VSC and then click on the version number next to
   `TypeScript React` in the status bar and select 'Use Workspace Version' in the popup menu.

## Deployment

Follow the instructions in this
[Guide](https://docs.google.com/document/d/1EacCSUhaHXaL8ll8xjcd4svyguEO-ipf5aF980-_q8E)
to setup an S3 & Cloudfront distribution that can be used with Github actions.
See also `s3_deploy.sh`, and `./github/ci.yml`.

Production releases to S3 are based on the contents of the /dist folder and are built automatically by GitHub Actions
for each branch pushed to GitHub and each merge into production.

Merges into production are deployed to http://starter-projects.concord.org.

Other branches are deployed to http://starter-projects.concord.org/branch/<name>.

To deploy a production release:

1. Increment version number in package.json
2. Create new entry in CHANGELOG.md
3. Run `git log --pretty=oneline --reverse <last release tag>...HEAD | grep '#' | grep -v Merge` and add contents (after edits if needed to CHANGELOG.md)
4. Run `npm run build`
5. Copy asset size markdown table from previous release and change sizes to match new sizes in `dist`
6. Create `release-<version>` branch and commit changes, push to GitHub, create PR and merge
7. Checkout master and pull
8. Checkout production
9. Run `git merge master --no-ff`
10. Push production to GitHub
11. Use https://github.com/concord-consortium/starter-projects/releases to create a new release tag

### Testing

Run `npm test` to run jest tests. Run `npm run test:full` to run jest and Cypress tests.

##### Cypress Run Options

Inside of your `package.json` file:
1. `--browser browser-name`: define browser for running tests
2. `--group group-name`: assign a group name for tests running
3. `--spec`: define the spec files to run
4. `--headed`: show cypress test runner GUI while running test (will exit by default when done)
5. `--no-exit`: keep cypress test runner GUI open when done running
6. `--record`: decide whether or not tests will have video recordings
7. `--key`: specify your secret record key
8. `--reporter`: specify a mocha reporter

##### Cypress Run Examples

1. `cypress run --browser chrome` will run cypress in a chrome browser
2. `cypress run --headed --no-exit` will open cypress test runner when tests begin to run, and it will remain open when tests are finished running.
3. `cypress run --spec 'cypress/integration/examples/smoke-test.js'` will point to a smoke-test file rather than running all of the test files for a project.

## License

Starter Projects are Copyright 2018 (c) by the Concord Consortium and is distributed under the [MIT license](http://www.opensource.org/licenses/MIT).

See license.md for the complete license text.
