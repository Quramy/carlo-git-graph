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
  const branches = await repo.readBranches();

  const commitMap: Map<string, CommitItem> = new Map();
  const rootMap: Map<string, string> = new Map();
  const rootHashes: string[] = [];

  let bc = 0;

  const traverseCommit = async (commit: Commit, bid: number, nextHash?: string, mergeTo?: number) => {
    while (true) {
      const prev = commitMap.get(commit.hash);
      if (nextHash && prev) {
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
        break;
      }
      if (commit.isMergeCommit) {
        await traverseCommit(commit.walkSync(0), bid, commit.hash);
        await commit.mergedParentHashes.reduce(async (acc, h) => {
          await acc;
          await traverseCommit(commit.walkSync(h), ++bc, commit.hash, bid);
        }, Promise.resolve());
        break;
      }
      nextHash = commit.hash;
      commit = await commit.walk();
    }
  };

  await branches.reduce(async (acc, branch) => {
    await acc;
    let commit = branch.commit;
    await traverseCommit(commit, 0);
  }, Promise.resolve());

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

// createGraph("/Users/yosuke/git/reg-suit").then(({ commitMap: x })=> {
//   console.log(x.size);
//   console.log(x.get("ddf5a4cdfda93c27a7cf2cfeae3c593ace19cacf"));
//   const c = x.get("ddf5a4cdfda93c27a7cf2cfeae3c593ace19cacf");
//   console.log(x.get(c!.checkoutHashList[0]));
// });
