# sync-linear

A script to collect todo from code and store them as linear tickets.

## User Instruction

- To add your todos as linear tickets, write any todo in the following format in your code -

  ```
  \\ todo: If you're happy and you know it, clap your hands

  or

  \\    toDo : If you're happy and you know it, stomp your feet

  or

  \\TOdo:If you're happy and you know it, shout hurray
  ```

- Stage your changes. Our code will only detect the new or modified todos between your very last commit and staged changes.

- Run the script using the methods from the [Run](#run) section.

- The line after the colon will be added as a linear ticket.

- **The link to the ticket will be added as the next line of the todo comment in your code.** _(If there's no linear ticket URL present already)_

## Installation

To install the package, use the following commands -

To install using npm,

```
npm i sync-linear
```

or

To install using yarn,

```
yarn add sync-linear
```

## Setting up Environment Variables

For the package to work, you'll need to add your Linear API key and team identifier as your environment variable.

For that, follow the given steps -

- Open a file named _.env_ in your root project folder.
- Go to [Linear](https://linear.app/) and get your team name and corresponding API key.
- Add the following two environment variables in the _.env_ file.

```
LINEAR_API_KEY = [Your API key]
LINEAR_TEAM_IDENTIFIER = [Your team identifier]
```

## Setting up Husky

To use `sync-linear`'s functionalities as a precommit script, follow these steps -

- Install Husky ([Installation guidelines](https://typicode.github.io/husky/#/)).

  We're including the yarn installation here

  Install husky

  ```
    yarn add husky --dev
  ```

- Enable Git hooks

  ```
    yarn husky install
  ```

- Create a Git hook
  ```
    npx husky add .husky/pre-commit "npx sync-linear"
  ```

## Run

### As a precommit script

If you have followed the [Setting up Husky](#setting-up-husky) section, every time you commit, `sync-linear` will run as your precommit script.

### As an individual command

Use the following command-

```
  npx sync-linear [optional:Your team identifier]
```

Use the optional argument if you want to store the linear tickets in a different team from the one set up in the _.env_ file.
