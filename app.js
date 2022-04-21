#!/usr/bin/env node
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv").config();
const NodeGit = require("nodegit");
const pathToRepo = require("path").resolve(".git");
const LINEAR_API_KEY = process.env.LINEAR_API_KEY;
const LINEAR_TEAM_IDENTIFIER = process.env.LINEAR_TEAM_IDENTIFIER;
const { LinearClient, LinearFetch, User } = require("@linear/sdk");
const getTodoFromComment = (comment) => __awaiter(void 0, void 0, void 0, function* () {
    if (comment.substring(0, 4).toLowerCase() == "todo") {
        comment = comment.substring(4).trim();
        if (comment[0] === ":") {
            comment = comment.substring(1).trim();
            return comment;
        }
    }
    return "";
});
const getTodoList = (pathToRepo) => __awaiter(void 0, void 0, void 0, function* () {
    const todoList = [];
    const repository = yield NodeGit.Repository.open(pathToRepo);
    const commit = yield repository.getHeadCommit();
    const tree = yield (commit ? commit.getTree() : null);
    const index = yield repository.index();
    const diff = yield NodeGit.Diff.treeToIndex(repository, tree, index, null);
    const arrayConvenientPatch = yield diff.patches();
    for (const patch of arrayConvenientPatch) {
        const hunks = yield patch.hunks();
        for (const hunk of hunks) {
            const lines = yield hunk.lines();
            for (const line of lines) {
                const refinedLine = String.fromCharCode(line.origin()) + line.content().trim();
                if (refinedLine === undefined)
                    continue;
                if (refinedLine.substring(0, 3) === "+//") {
                    const todo = yield getTodoFromComment(refinedLine.substring(3).trim());
                    if (todo !== "") {
                        todoList.push(todo);
                    }
                }
            }
        }
    }
    return todoList;
});
// Call start
(() => __awaiter(void 0, void 0, void 0, function* () {
    const todoList = yield getTodoList(pathToRepo);
    const linearClient = new LinearClient({ apiKey: LINEAR_API_KEY });
    const teams = yield linearClient.teams();
    let KEY = process.argv[2] !== undefined ? process.argv[2] : LINEAR_TEAM_IDENTIFIER;
    let idx = -1, i = 0;
    for (const team of teams.nodes) {
        if (team.key === KEY) {
            idx = i;
            break;
        }
        i++;
    }
    if (idx === -1)
        return 0;
    const team = teams.nodes[idx];
    if (team.id) {
        for (const todo of todoList) {
            console.log(todo);
            yield linearClient.issueCreate({
                teamId: team.id,
                title: todo,
            });
        }
    }
    return 0;
}))();
