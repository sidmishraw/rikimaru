/**
 * riki-core.js
 * @author Sidharth Mishra
 * @description rikimaru core logic
 * @created Wed Nov 15 2017 19:41:28 GMT-0800 (PST)
 * @copyright 2017 Sidharth Mishra
 * @last-modified Sun Jun 03 2018 18:50:13 GMT-0700 (PDT)
 */

//---------------------------------------------------------------------------------------

//# imports commonjs style
const http = require('http');
const Request = require('request');
const async = require('async');
const _ = require('lodash');
const path = require('path');
const vscode = require('vscode');
//# imports commonjs style
const rikiBrowser = require('./riki-browser');
//---------------------------------------------------------------------------------------

// The default search string
let defaultSearchString = 'dfs';

// Request URL
//`https://api.github.com/search/code?q=${searchString}+in:file+language:${languageName+repo:OpenGenus/cosmos`;

//---------------------------------------------------------------------------------------

/**
 * fetchResults
 * ~~~~~~~~~~~~~~~
 * Queries GitHub's Search API and fetches the search results.
 *
 * @param {string} searchString The search string entered by user
 * @param {(string) => any} callback The callback function to be called after this fetches the search results from GitHub
 */
function fetchResults(searchString, callback) {
  //# user's configurations
  const username =
      vscode.workspace.getConfiguration('rikimaru').get('user.github.name');
  const userToken = vscode.workspace.getConfiguration('rikimaru')
                        .get('user.github.personal-token');
  //# user's configurations

  if (!searchString) searchString = defaultSearchString;

  //# cleanse searchString of `-` sign, since it is reserved for queries
  searchString = searchString.replace('-', '+');

  //# Data fetch
  Request.get(
      `https://api.github.com/search/code?q=${
          encodeURIComponent(searchString)}+in:file+repo:OpenGenus/cosmos`,
      {
        auth: {user: username, password: userToken},
        headers: {'User-Agent': 'request'}
      },
      (error, response, body) => {
        // console.log(`${JSON.stringify(response)}`);
        callback(null, body);
        if (error) console.log(`Error: ${JSON.stringify(error)}`);
      });
  //# Data fetch
}

//---------------------------------------------------------------------------------------

/**
 * processResults
 * ~~~~~~~~~~~~~~~~~
 * Processes the search results obtained from GitHub.
 *
 * @param {string} results the results obtained from GitHub's search API
 * @param {(string) => any} callback the callback to be called after the results are processed
 */
function processResults(results, callback) {
  let pResults_temp = JSON.parse(results);

  //# no items found scenario
  if (!pResults_temp['items'] ||
      (pResults_temp['items'] && pResults_temp['items'].length === 0)) {
    const panel = vscode.window.createWebviewPanel(
        'rikimaru', `Rikimaru couldn't find what you searched for-`,
        vscode.ViewColumn.One, {enableScripts: true});
    panel.webview.html = `
                  <html>
                    <head></head>
                    <body>No content matching your query was found using Github's search.</body>
                  </html>
                  `;
    return callback('No items to display!');
  }
  //# no items found scenario

  //# data cleansing
  let pResults = pResults_temp['items'].map(item => {
    return {
      name: item.name,
      path: item.path,
      url: item.html_url,
      api_url: item.url  // the api URL, needed for fetching the actual raw
      // content from Github
    };
  });
  //# data cleansing

  callback(null, pResults);
}

//---------------------------------------------------------------------------------------

/**
 * displayResults
 * ~~~~~~~~~~~~~~~~
 * Displays the processed results to the user using the
 * vscode.window.showQuickPick component.
 *
 * @param {[object]} pResults The processed results to be shown to the user
 */
function displayResults(pResults, callback) {
  //# display waterfall pipeline
  async.waterfall(
      [
        /**
         * Shows the quick pick menu to the user and then executes the callback
         * after the User selects an item from it.
         *
         * @param {function} callback The callback function that needs to be executed after the user selects an item.
         */
        function showQuickPickToUser(callback) {
          //# let the user select the option
          vscode.window
              .showQuickPick(pResults.map(
                  p => `${p['name']} located at: ${
                      path.join('cosmos', p['path'])}`))
              .then(
                  value => callback(null, value),
                  reason => console.log(reason));
          //# let the user select the option
        },

        /**
         * Opens the content downloaded from Github in VSCode's webview, see the
         * code right in your editor!!
         *
         * @param {string} result The result from previous stage
         * @param {function} callback The callback to execute after this
         */
        function openInWebview(result, callback) {
          //# open user's selection in the default browser
          // console.log("result = ", result);
          if (!result || (result && result.length === 0)) return;  // base case

          const [name, resourcePath] =
              result.split(' located at: ');  // find the path, the path is
          // unique, name isn't

          if (resourcePath.split('/').length < 2)
            return;  // base case #2 --- unexpected

          const resourcePathSansCosmosInitial =
              resourcePath.split('/').splice(1).join('/');

          // console.log(name, resourcePath, resourcePathSansCosmosInitial);

          const matchingResouces =
              pResults.filter(r => r['path'] === resourcePathSansCosmosInitial);

          if (matchingResouces.length < 1)
            return;  // base case #3 --- unexpected

          const resourceURL =
              matchingResouces[0]['api_url'];  // the URL to open in the browser

          // `https://raw.githubusercontent.com/OpenGenus/cosmos/64af5e8c56c221b6b21f85d35486a71805a1babf/code/graph_algorithms/src/bridges_in_graph/bridges.cpp`;

          // fetch the html contents from the resourceURL and render the HTML in
          // the webview.
          //

          //# user's configurations -- needed for getting the download URL
          const username = vscode.workspace.getConfiguration('rikimaru')
                               .get('user.github.name');
          const userToken = vscode.workspace.getConfiguration('rikimaru')
                                .get('user.github.personal-token');
          //# user's configurations

          Request.get(
              resourceURL, {
                auth: {user: username, password: userToken},
                headers: {'User-Agent': 'request'}
              },
              (err, res, body) => {
                const panel = vscode.window.createWebviewPanel(
                    'rikimaru', `Rikimaru found ${name}`, vscode.ViewColumn.One,
                    {enableScripts: true});

                if (!body) {
                  console.log(`No content found for the file ${name}`);
                  panel.webview.html = `
                  <html>
                    <head></head>
                    <body>No content matching your query was found using Github's search.</body>
                  </html>
                  `;
                  return;
                }

                const item = JSON.parse(body);
                const raw_url = item['download_url'];

                if (!raw_url) {
                  console.log(`No content found for the file ${name}`);
                  panel.webview.html = `
                  <html>
                    <head></head>
                    <body>No content matching your query was found using Github's search.</body>
                  </html>
                  `;
                  return;
                }

                Request.get(raw_url, (err, res, body) => {
                  panel.webview.html = `
                  <html>
                    <head></head>
                    <body>
                      <pre style="word-wrap: break-word; white-space: pre-wrap;">${
                      body}</pre>
                    </body>
                  </html>
                `;
                });
              });
        }
      ],
      (err, reason) => console.log(err, reason));
  //# display waterfall pipeline
}

//---------------------------------------------------------------------------------------

/**
 * search
 * ~~~~~~~~~
 * The rikimaru search entry point
 */
function search(searchString) {
  if (!searchString || (searchString && searchString.length === 0)) {
    vscode.window.showErrorMessage('No search string was entered.');
    return;
  }

  //# async waterfall for control flow
  async.waterfall(
      [
        callback => callback(null, searchString), fetchResults, processResults,
        displayResults
      ],
      (err, result) =>
          console.log(`Error: ${JSON.stringify(err, null, 4)}, Result: ${
              JSON.stringify(result, null, 4)}`));
  //# async waterfall for control flow
}

//---------------------------------------------------------------------------------------

//# export search
module.exports.search = search;
//# export search

//---------------------------------------------------------------------------------------
