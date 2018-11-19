import path from "path";
import { Repository, Commit } from "tiny-commit-walker";
import { CommitItem, CommitGraphs } from "./types";

function mapToJson<T>(map: Map<string, T>) {
  const out: { [k: string]: T } = { };
  map.forEach((v, k) => {
    out[k] = v;
  });
  return out;
}

async function createGraph(repoPath: string) {
  const repo = new Repository(path.join(repoPath, ".git"));
  // const branches = await repo.readBranches();
  const lastCommit = await repo.readCommitByBranch("master");

  const commitMap: Map<string, CommitItem> = new Map();
  const rootMap: Map<string, string> = new Map();
  const rootHashes: string[] = [];

  let bc = 0;

  let afterTasks: (() => Promise<any>)[] = [];
  const traverseCommit = async (commit: Commit, bid: number, nextHash?: string, mergeTo?: number) => {
    while (true) {
      const prev = commitMap.get(commit.hash);
      if (nextHash && prev) {
        console.log("found parent", prev.hash, nextHash);
        prev.checkoutHashList.push(nextHash);
        rootMap.set(bid + "", commit.hash);
        break;
      }
      const item: CommitItem = {
        hash: commit.hash,
        bid: bid + "",
        checkoutHashList: [],
        parentHashes: commit.parentHashes,
        nextHash,
        mergeTo: (mergeTo as any) >= 0 ? (mergeTo as any): -1,
        info: {
          author: commit.author,
          message: commit.message,
        },
      };
      commitMap.set(commit.hash, item);
      if (!commit.hasParents) {
        rootHashes.push(commit.hash);
        rootMap.set(bid + "", commit.hash);
        await afterTasks.reduce((acc, t) => acc.then(() => t()), Promise.resolve());
        afterTasks = [];
        break;
      }
      if (commit.isMergeCommit) {
        let mc = commit;
        afterTasks.push(() => {
          console.log("traverse merged branch", mc.hash);
          return mc.mergedParentHashes.reduce(async (acc, h) => {
            await acc;
            await traverseCommit(mc.walkSync(h), ++bc, mc.hash, bid);
          }, Promise.resolve())
        });
      }
      nextHash = commit.hash;
      commit = await commit.walk(0);
    }
  };

  await traverseCommit(lastCommit, 0);

  // await branches.reduce(async (acc, branch) => {
  //   await acc;
  //   let commit = branch.commit;
  //   await traverseCommit(commit, 0);
  // }, Promise.resolve());

  return { commitMap, rootHashes, rootMap };
}

export async function fetchGraph(repoPath: string): Promise<CommitGraphs> {
  const { commitMap, rootHashes, rootMap } = await createGraph(repoPath);
  return {
    commits: mapToJson(commitMap),
    rootMap: mapToJson(rootMap),
    rootHashes,
  }
}

