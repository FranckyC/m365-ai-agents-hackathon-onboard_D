# Microsoft AI Agents Hackathon - "OnBoard-D" Agent solution

# Getting started 

## Prerequisites - Tooling

The following prerequisites need to be installed first on your machine to work locally:

> - [Node.js v20 or later](https://nodejs.org/en/download/package-manager). You can also use [nvm](https://github.com/coreybutler/nvm-windows) on WIndows to easily manage Node.js versions on your machaine.
> - [Teams Toolkit Visual Studio Code Extension](https://aka.ms/teams-toolkit) version 5.14.0 and higher or [Teams Toolkit CLI](https://aka.ms/teamsfx-toolkit-cli)

## Test the agent locally 

1. Open the `apps/agent` using Visual Studio Code. The Teams Toolkit extension should appear on the left bar.
2. Connect to your Azure Account in the "Accounts" section.
3. Create a `env/.env.local` file copying the content fromt the `env/.env.local.template` file.
3. Create a `env/.env.local.user` account with the following values (DEV) environment: [https://share.1password.com/s#DHJfKwn4RD2-toOSVnvpyL8hwu1657oMvqJfGlxp1ns](https://share.1password.com/s#DHJfKwn4RD2-toOSVnvpyL8hwu1657oMvqJfGlxp1ns) (1 time copy!)
3. On the "Debug" left bar option, run the "Debug in Teams (Edge)" debug configuration. It will start the deployment procedure and create a new bot.

## Test notifications

1. Once the bot is started, go to [https://dev.botframework.com/](https://dev.botframework.com/) and browse your bot.
2. Go to "Settings" and copy the hostname of the messaging endpoint (ex: `https://j2w5sp8r-3978.use.devtunnels.ms`). This endpoint changes every time you debug your bot (i.e. F5).
3. Open Postman (or any other similar tool) and send a POST request to `https://{hostname}.use.devtunnels.ms/api/notitication`. You should be prompted on Teams by the agent.


## Useful resources

https://learn.microsoft.com/en-us/microsoftteams/platform/toolkit/teamsfx-sdk

## Showcase

- Handling multiple types of authentication (SSO delegated with OBO or Client Credentials (notifcation)) to access Microsoft Graph with LLM tools using @teamsfx
- Proactive messaging