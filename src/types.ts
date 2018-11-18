import { Author } from "tiny-commit-walker";

export type CommitItem = {
  hash: string,
  nextHash?: string,
  bid: string,
  checkoutHashList: string[];
  parentHashes: string[];
  mergeTo: number;
  info: {
    message: string,
    author: Author,
  },
};

export type CommitGraphs = {
  commits: { [k: string]: CommitItem },
  rootMap: { [k: string]: string },
  rootHashes: string[],
};
