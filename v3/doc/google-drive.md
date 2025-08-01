CODAP supports saving and loading from Google Drive via the CFM.

## Local Testing
You can test the google drive integration locally by adding adding a `.env` file to the `v3` folder.
With the following content:
```
GOOGLE_DRIVE_APP_ID=[AppId]
GOOGLE_DRIVE_CLIENT_ID=[ClientId]
GOOGLE_DRIVE_API_KEY=[ApiKey]
```

These values can be found in the Google Cloud interface. The cloud project is called "CODAP". It is **not** inside of the Concord Consortium organization.

### AppId
Find the project dashboard: If you click on the hamburger menu on the top left and then "Cloud overview", then select "Dashboard. Now copy the "Project number". This is the AppId that you need.

### ClientId
In the cloud project's API & Services section, go to the Credentials section. Then in the OAuth 2.0 Client IDs section open the "codap-dev" and copy the Client ID. This client has been configured for local development. Look at its Authorized JavaScript origins and make sure you are running CODAP locally from a matching origin.

### ApiKey
In the cloud project's API & Services section, go to the Credentials section. Then in the API Keys section is a list of api keys (currently there is only one). Open the "Browser key 1" key, then on the page that comes up click the "Show key" button.
