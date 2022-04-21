#!/usr/bin/env node
const NodeGit = require("nodegit");
const pathToRepo = require("path").resolve(".git");
const LINEAR_API_KEY = "lin_api_jrmrYQsNKV8YFpXkT3kixC9TTHDzRI7IjFoQMw7h"; // write your linear API key here
const LINEAR_TEAM_IDENTIFIER = "SAB"; // write your linear team identifier here, Three letter word, all capital
const { LinearClient, LinearFetch, User } = require("@linear/sdk");

const getTodoFromComment = async (comment: string) => {
  if (comment.substring(0, 4).toLowerCase() == "todo") {
    comment = comment.substring(4).trim();
    if (comment[0] === ":") {
      comment = comment.substring(1).trim();
      return comment;
    }
  }
  return "";
};

const getTodoList = async (pathToRepo: string) => {
  const todoList: Array<string> = [];
  const repository = await NodeGit.Repository.open(pathToRepo);
  const commit = await repository.getHeadCommit();
  const tree = await (commit ? commit.getTree() : null);
  const index = await repository.index();
  const diff = await NodeGit.Diff.treeToIndex(repository, tree, index, null);

  const arrayConvenientPatch = await diff.patches();
  for (const patch of arrayConvenientPatch) {
    const hunks = await patch.hunks();
    for (const hunk of hunks) {
      const lines = await hunk.lines();
      for (const line of lines) {
        const refinedLine =
          String.fromCharCode(line.origin()) + line.content().trim();
        if (refinedLine === undefined) continue;
        if (refinedLine.substring(0, 3) === "+//") {
          const todo = await getTodoFromComment(
            refinedLine.substring(3).trim()
          );
          if (todo !== "") {
            todoList.push(todo);
          }
        }
      }
    }
  }
  return todoList;
};

// Call start
(async () => {
  const todoList = await getTodoList(pathToRepo);
  const linearClient = new LinearClient({ apiKey: LINEAR_API_KEY });
  const teams = await linearClient.teams();
  let KEY =
    process.argv[2] !== undefined ? process.argv[2] : LINEAR_TEAM_IDENTIFIER;
  let idx = -1,
    i = 0;
  for (const team of teams.nodes) {
    if (team.key === KEY) {
      idx = i;
      break;
    }
    i++;
  }
  if (idx === -1) return 0;
  const team = teams.nodes[idx];
  if (team.id) {
    for (const todo of todoList) {
      console.log(todo);
      await linearClient.issueCreate({
        teamId: team.id,
        title: todo,
      });
    }
  }
  return 0;
})();
export {};
