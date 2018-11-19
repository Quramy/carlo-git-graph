import { CommitGraphs } from "./types";

declare function fetchGraph(): Promise<CommitGraphs>;

function render(commitGraphs: CommitGraphs) {
  const gitGraph = new GitGraph({
    template: "metro",
    orientation: "vertical",
    mode: "compact",
  });
  const master = gitGraph.branch("master");

  const rootHash = commitGraphs.rootHashes[0];
  let currentCommit = commitGraphs.commits[rootHash];
  const branchMap: Map<string, GitGraph.Branch> = new Map();
  const waitToMerge: Map<string, GitGraph.Branch> = new Map();
  let branch = master;
  if (!currentCommit) {
    throw new Error("");
  }
  branchMap.set(currentCommit.bid, branch);
  const commitBranch = (branch: GitGraph.Branch, commit: typeof currentCommit) => {
    while (true) {
      if (!commit) {
        throw new Error("");
      }
      if (commit.parentHashes[1]) {
        const mh = commit.parentHashes[1];
        const bb = waitToMerge.get(mh);
        if (!bb) {
          console.error(commit);
          throw new Error("no branch to merge");
        }
        bb.merge(branch, {
          sha1: commit.hash,
          author: commit.info.author.name,
          date: new Date(commit.info.author.date).toISOString(),
          message: commit.info.message,
        })
        waitToMerge.delete(mh);
      } else {
        branch.commit({
          sha1: commit.hash,
          author: commit.info.author.name,
          date: new Date(commit.info.author.date).toISOString(),
          message: commit.info.message,
        });
      }
      if (commit.checkoutHashList && commit.checkoutHashList.length) {
        commit.checkoutHashList.forEach(h => {
          const c = commitGraphs.commits[h];
          if (!c) {
            throw new Error();
          }
          const b = branch.branch(c.bid);
          commitBranch(b, c);
        });
      }
      if (commit.mergeTo >= 0 && commit.nextHash) {
        const n = commitGraphs.commits[commit.nextHash];
        if (!n) {
            throw new Error("no next hash");
        }
        if (n.parentHashes.length > 1 && n.parentHashes.includes(commit.hash)) {
          waitToMerge.set(commit.hash, branch);
          break;
        }
      }
      if (!commit.nextHash) {
        break;
      }
      commit = commitGraphs.commits[commit.nextHash];
    }
  };
  commitBranch(master, currentCommit);
}

async function main() {
  const commitGraphs = await fetchGraph();
  (window as any)["commitGraphs"] = commitGraphs;
  console.log(commitGraphs);
  render(commitGraphs);
}

main();
