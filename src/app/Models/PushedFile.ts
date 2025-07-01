export interface PushedFile {
  id: number;
  repoName: string;
  commitId: string;
  commitMessage: string; // <-- Add this if not present
  filePath: string;
  folderPath: string;
  fileType: string;
  fileExtension: string;
  branch: string;
  pusherName: string;
  content: string;
  pushedAt: string;
  size?: number; // Optional size property to represent file size
}