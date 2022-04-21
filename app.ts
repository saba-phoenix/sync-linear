#!/usr/bin/env node
require("dotenv").config();
const NodeGit = require("nodegit");
const pathToRepo = require("path").resolve(".git");
const LINEAR_API_KEY = process.env.LINEAR_API_KEY;
const LINEAR_TEAM_IDENTIFIER = process.env.LINEAR_TEAM_IDENTIFIER;
const fs = require("fs");
const {
  LinearClient,
  LinearFetch,
  LinearDocument,
  User,
} = require("@linear/sdk");
const linearClient = new LinearClient({ apiKey: LINEAR_API_KEY });

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

const readAllLinesFromFile = (fileName: string) => {
  const allLine = fs
    .readFileSync(fileName)
    .toString()
    .replace(/\r\n/g, "\n")
    .split("\n");
  return allLine;
};

const createSingleTodoAndGetLink = async (todo: string, teamId: string) => {
  const issueCreateToken = await linearClient.issueCreate({
    teamId: teamId,
    title: todo,
  });
  if (issueCreateToken._issue.id === undefined) return -1;
  const issueId = issueCreateToken._issue.id;
  const issues = await linearClient.issues({
    orderBy: LinearDocument.PaginationOrderBy.UpdatedAt,
    first: 5,
  });
  const issueList = issues.nodes;
  if (issueList === undefined) return -1;
  let issueIdx = -1;
  let i = 0;
  for (const issue of issueList) {
    if (issue.id === issueId) {
      issueIdx = i;
      break;
    }
    i++;
  }
  if (issueIdx === -1) return -1;
  const issueLink = issueList[issueIdx].url;
  return issueLink;
};

const doesntContainLinearLink = (line: any) => {
  if (line === undefined) return false;
  line = line.toString().trim();
  if (line.substring(0, 2) === "//") {
    const math = "https://linear.app/";
    line = line.substring(2).trim();
    if (line.substring(0, 19) === "https://linear.app/") {
      return false;
    }
  }
  return true;
};

const getTodoList = async (pathToRepo: string, teamId: string) => {
  const stagedFilePathList: Array<string> = [];
  const repository = await NodeGit.Repository.open(pathToRepo);
  const commit = await repository.getHeadCommit();
  const tree = await (commit ? commit.getTree() : null);
  const index = await repository.index();
  const diff = await NodeGit.Diff.treeToIndex(repository, tree, index, null);

  const arrayConvenientPatch = await diff.patches();
  for (const patch of arrayConvenientPatch) {
    const filePath = patch.newFile().path();
    stagedFilePathList.push(filePath);
    const allLineList = readAllLinesFromFile(filePath);
    const todoList: Array<string> = [];
    const todoLinesIdxList: Array<number> = [];

    const hunks = await patch.hunks();
    for (const hunk of hunks) {
      const lines = await hunk.lines();
      for (const line of lines) {
        const lineNo = line.newLineno() - 1;
        const refinedLine =
          String.fromCharCode(line.origin()) + line.content().trim();
        if (refinedLine === undefined) continue;
        if (refinedLine.substring(0, 3) === "+//") {
          const todo = await getTodoFromComment(
            refinedLine.substring(3).trim()
          );
          if (todo !== "") {
            todoList.push(todo);
            todoLinesIdxList.push(lineNo);
          }
        }
      }
    }

    let alreadyAdded = 0;
    for (let i = 0; i < todoList.length; i++) {
      // ofc todoIdxList will be sorted
      const todoIdx = todoLinesIdxList[i];
      const todo = todoList[i];
      const modifiedIdx = todoIdx + alreadyAdded;
      if (modifiedIdx + 1 != allLineList.length) {
        const dcl = doesntContainLinearLink(allLineList[modifiedIdx + 1]);
        if (dcl) {
          const link = await createSingleTodoAndGetLink(todo, teamId);
          if (link === -1) continue;
          const processedLink = "// " + link;

          allLineList.splice(modifiedIdx + 1, 0, processedLink);
          alreadyAdded++;
        }
      } else {
        const link = await createSingleTodoAndGetLink(todo, teamId);
        if (link === -1) continue;
        const processedLink = "// " + link;
        allLineList.splice(modifiedIdx + 1, 0, processedLink);
        alreadyAdded++;
      }
    }

    const wholeText = allLineList.join("\r\n");
    fs.writeFileSync(filePath, wholeText, "utf8");
  }
  const newIndex = await repository.refreshIndex(); // read latest
  stagedFilePathList.forEach((filePath) => newIndex.addByPath(filePath)); // stage each file
  await newIndex.write(); // flush changes to index
};

// Call start
(async () => {
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
  if (!team.id) {
    return 0;
  }
  await getTodoList(pathToRepo, team.id);
  return 0;
})();
export {};
