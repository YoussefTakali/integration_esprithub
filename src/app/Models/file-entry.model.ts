export interface FileEntry {
    name: string;
    type: 'file' | 'folder';
    lastCommit: string;
    author: string;
    lastCommitTime: string;
}

export interface RepoFile {
  name: string;
  size?: number; // Made size optional to handle missing data
}