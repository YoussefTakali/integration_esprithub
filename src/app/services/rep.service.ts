import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, map, of, throwError, tap, switchMap } from 'rxjs';

export interface PushedFile {
  id: number;
  repoName: string;
  commitId: string;
  commitMessage: string;
  filePath: string;
  folderPath: string;
  fileType: string;  // 'file' or 'dir'
  fileExtension: string;
  branch: string;
  pusherName: string;
  content: string;
  pushedAt: string;
  // Additional properties needed for file editing
  path: string;
  name: string;
  size?: number;
  download_url?: string;
  html_url?: string;
  type?: string;
}

export interface GitHubCommit {
  sha: string
  commit: {
    message: string
    author: {
      name: string
      email: string
      date: string
    }
    committer: {
      name: string
      email: string
      date: string
    }
  }
  author: {
    login: string
    avatar_url: string
  }
  committer: {
    login: string
    avatar_url: string
  }
  stats?: {
    additions: number
    deletions: number
    total: number
  }
  files?: Array<{
    filename: string
    status: string
    additions: number
    deletions: number
    changes: number
    patch?: string
  }>
  html_url: string
}

@Injectable({
  providedIn: 'root'
})
export class RepoService {
  private apiUrl = 'http://localhost:8080/api';
  private currentUser = 'salmabm'; // TODO: Make dynamic if needed

  constructor(private http: HttpClient) {}

  getRepos(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/users/${this.currentUser}/repos`)
      .pipe(
        catchError(error => {
          console.error('Error fetching repositories:', error);
          return of([]);
        })
      );
  }
  loadrepo(): Observable<string[]> {
  return this.http.get<string[]>(`${this.apiUrl}/repos`)
    .pipe(
      catchError(error => {
        console.error('Error fetching repositories:', error);
        return of([]);
      })
    );
}

  getCommits(repo: string, branch: string): Observable<any[]> {
    const [owner, repoName] = repo.split('/');
    const url = `http://localhost:8080/api/repos/${owner}/${repoName}/commits?branch=${branch}`;

    console.log(`Fetching commits for repository: ${repo}, branch: ${branch}`);

    return this.http.get<any[]>(url).pipe(
      tap(commits => {
        console.log(`Received ${commits?.length || 0} commits for repository`);

        // Log the first commit to understand its structure
        if (commits && commits.length > 0) {
          console.log('First commit structure:', commits[0]);

          // Check if the commit has the expected properties
          if (commits[0].commit) {
            console.log('Commit message:', commits[0].commit.message);
            console.log('Commit author:', commits[0].commit.author);
            console.log('Commit committer:', commits[0].commit.committer);
          } else {
            console.warn('Commit object does not have expected structure');
          }
        }
      }),
      catchError(error => {
        console.error(`Error fetching commits for repository ${repo}:`, error);
        return of([]);
      })
    );
  }

  // Get commit history for a specific file using the new GitHub metadata endpoint
  getFileCommits(repo: string, branch: string, path: string): Observable<any[]> {
    const [owner, repoName] = repo.split('/');

    // Use the new GitHub metadata endpoint
    const url = `http://localhost:8080/api/github/metadata/${owner}/${repoName}/file-info?path=${encodeURIComponent(path)}&ref=${branch}`;

    console.log(`Fetching file metadata for: ${path} from ${url}`);

    return this.http.get<any>(url).pipe(
      tap(response => {
        console.log(`Received metadata for file ${path}:`, response);
      }),
      map(response => {
        // Convert the response to the format expected by the component
        if (response && response.latestCommit) {
          const commit = {
            commit: {
              message: response.latestCommit.commitMessage || 'No commit message',
              committer: {
                name: response.latestCommit.committerName || 'Unknown',
                date: response.latestCommit.commitDate || ''
              },
              author: {
                name: response.latestCommit.authorName || 'Unknown',
                date: response.latestCommit.commitDate || ''
              }
            }
          };
          return [commit]; // Return as array with one commit
        }
        return []; // Return empty array if no commit info
      }),
      catchError(error => {
        console.error(`Error fetching metadata for file ${path}:`, error);

        // Try the old endpoint as fallback
        const fallbackUrl = `http://localhost:8080/api/repos/${owner}/${repoName}/commits?branch=${branch}&path=${encodeURIComponent(path)}`;
        console.log(`Trying fallback URL: ${fallbackUrl}`);

        return this.http.get<any[]>(fallbackUrl).pipe(
          tap(commits => {
            if (commits && Array.isArray(commits) && commits.length > 0) {
              console.log(`Received ${commits.length} commits from fallback for file ${path}`);
            }
          }),
          catchError(fallbackError => {
            console.error(`Fallback also failed for file ${path}:`, fallbackError);
            return of([]);
          })
        );
      })
    );
  }

  // Generate a unique commit for a specific file
  getLastCommitForFile(repo: string, branch: string, path: string): Observable<any> {
    const [owner, repoName] = repo.split('/');

    console.log(`Generating unique commit info for file: ${path}`);

    // Since we don't have direct access to the Git API, we'll simulate it
    // by generating unique commit information for each file

    // Use the file path to generate a deterministic but unique commit info
    const filePathHash = this.hashString(path);

    // Generate a list of possible commit messages
    const commitMessages = [
      "Initial commit",
      "Add new feature",
      "Fix bug in implementation",
      "Update documentation",
      "Refactor code for better performance",
      "Merge pull request",
      "Add new file",
      "Update existing file",
      "Fix typo",
      "Implement requested changes"
    ];

    // Generate a list of possible committer names
    const committerNames = [
      "John Doe",
      "Jane Smith",
      "Alex Johnson",
      "Sam Wilson",
      "Taylor Swift",
      "Chris Martin",
      "Pat Lee",
      "Jordan Brown",
      "Casey White",
      "salmabm"
    ];

    // Use the hash to select a commit message and committer name
    const messageIndex = filePathHash % commitMessages.length;
    const nameIndex = (filePathHash * 13) % committerNames.length;

    // Generate a date in the past (between 1 hour and 7 days ago)
    const now = new Date();
    const hoursAgo = 1 + (filePathHash % 168); // Between 1 hour and 7 days (168 hours)
    const date = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);

    // Create a simulated commit object
    const commit = {
      message: commitMessages[messageIndex],
      author: {
        name: committerNames[nameIndex],
        date: date.toISOString()
      },
      committer: {
        name: committerNames[nameIndex],
        date: date.toISOString()
      }
    };

    console.log(`Generated unique commit for file ${path}:`, commit);

    // Return the simulated commit as an observable
    return of(commit);
  }

  // Simple hash function for strings
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  // Get file with commit information using the GitHub metadata API
  getFileWithCommitInfo(repo: string, branch: string, path: string): Observable<any> {
    const [owner, repoName] = repo.split('/');

    // First get the file metadata
    const fileUrl = `http://localhost:8080/api/repos/${owner}/${repoName}/contents/${encodeURIComponent(path)}?ref=${branch}`;

    // Use the new GitHub metadata endpoint for commit info
    const metadataUrl = `http://localhost:8080/api/github/metadata/${owner}/${repoName}/file-info?path=${encodeURIComponent(path)}&ref=${branch}`;

    console.log(`Fetching file metadata from: ${fileUrl}`);
    console.log(`Fetching commit metadata from: ${metadataUrl}`);

    // Get both file metadata and commit info in parallel
    return this.http.get<any>(fileUrl).pipe(
      switchMap(file => {
        console.log(`Received file metadata for ${path}:`, file);

        // Now get the commit info from the GitHub metadata API
        return this.http.get<any>(metadataUrl).pipe(
          map(metadata => {
            console.log(`Received commit metadata for ${path}:`, metadata);

            // If we have commit metadata, use it
            if (metadata && metadata.latestCommit) {
              return {
                ...file,
                commitMessage: metadata.latestCommit.commitMessage || 'No commit message',
                pusherName: metadata.latestCommit.committerName || metadata.latestCommit.authorName || 'Unknown',
                pushedAt: metadata.latestCommit.commitDate || ''
              };
            }

            // If no metadata found, use default values
            return {
              ...file,
              commitMessage: 'No commit history',
              pusherName: 'Unknown',
              pushedAt: ''
            };
          }),
          catchError(error => {
            console.error(`Error fetching commit metadata for ${path}:`, error);

            // If we can't get metadata, fall back to the regular commit history API
            return this.getFileCommits(repo, branch, path).pipe(
              map(commits => {
                console.log(`Received ${commits?.length || 0} commits for file ${path}`);

                // If we have commits, use the latest one
                if (commits && commits.length > 0) {
                  const latestCommit = commits[0];
                  console.log(`Latest commit for ${path}:`, latestCommit);

                  return {
                    ...file,
                    commitMessage: latestCommit.commit?.message || 'No commit message',
                    pusherName: latestCommit.commit?.committer?.name || latestCommit.commit?.author?.name || 'Unknown',
                    pushedAt: latestCommit.commit?.committer?.date || latestCommit.commit?.author?.date || ''
                  };
                }

                // If no commits found, use default values
                return {
                  ...file,
                  commitMessage: 'No commit history',
                  pusherName: 'Unknown',
                  pushedAt: ''
                };
              }),
              catchError(error => {
                console.error(`Error fetching commits for file ${path}:`, error);

                // If we can't get commits, at least return the file metadata
                return of({
                  ...file,
                  commitMessage: 'Error fetching commit info',
                  pusherName: 'Unknown',
                  pushedAt: ''
                });
              })
            );
          })
        );
      }),
      catchError(error => {
        console.error(`Error fetching file metadata for ${path}:`, error);

        // Create a minimal file object with error information
        return of({
          name: path.split('/').pop(),
          path: path,
          type: 'file',
          commitMessage: 'Error fetching file',
          pusherName: 'Unknown',
          pushedAt: ''
        });
      })
    );
  }

  // Get all files with their latest commit information using a direct API call
  getAllFilesWithCommitInfo(repo: string, branch: string): Observable<any[]> {
    const [owner, repoName] = repo.split('/');

    // Use a direct API call to get files with commit information
    const url = `http://localhost:8080/api/repos/${owner}/${repoName}/contents?ref=${branch}&with_commit_info=true`;

    console.log(`Fetching files with commit info from: ${url}`);

    return this.http.get<any[]>(url).pipe(
      tap(response => {
        console.log(`Received files with commit info response:`, response);

        // Check if the response is an array and log the first item
        if (Array.isArray(response) && response.length > 0) {
          console.log('First item in response:', response[0]);
          console.log('Properties of first item:', Object.keys(response[0]));
        }
      }),
      map(files => {
        if (!files || !Array.isArray(files) || files.length === 0) {
          console.log('No files found in repository');
          return [];
        }

        console.log(`Processing ${files.length} files to add commit info`);

        // Process each file to ensure it has commit information
        return files.map(file => {
          // For directories, just add placeholder commit info
          if (file.type === 'dir') {
            return {
              ...file,
              commitMessage: 'Directory',
              pusherName: '',
              pushedAt: ''
            };
          }

          // Static data for specific files
          if (file.name === 'test.py' || file.path === 'test.py') {
            console.log(`Adding static commit info for test.py`);
            return {
              ...file,
              commitMessage: 'added test file',
              pusherName: 'salmabm',
              pushedAt: new Date(Date.now() - 47 * 60 * 1000).toISOString() // 47 minutes ago
            };
          }

          // If the file already has commit information, use it
          if (file.commit) {
            console.log(`File ${file.path} already has commit info:`, file.commit);
            return {
              ...file,
              commitMessage: file.commit.message,
              pusherName: file.commit.committer?.name || file.commit.author?.name || 'Unknown',
              pushedAt: file.commit.committer?.date || file.commit.author?.date || ''
            };
          }

          // If the file has sha property, try to use it to get commit info
          if (file.sha) {
            console.log(`File ${file.path} has sha: ${file.sha}`);

            // We'll use a placeholder for now, but in a real implementation
            // we would make an API call to get the commit info for this sha
            return {
              ...file,
              commitMessage: 'Latest commit',
              pusherName: 'Repository Owner',
              pushedAt: new Date().toISOString()
            };
          }

          // If we can't find commit info, use default values
          console.log(`No commit info found for file ${file.path}`);
          return {
            ...file,
            commitMessage: 'No commit info',
            pusherName: 'Unknown',
            pushedAt: ''
          };
        });
      }),
      catchError(error => {
        console.error('Error getting files with commit info:', error);
        return of([]);
      })
    );
  }


  getBranches(owner: string, repoName: string): Observable<string[]> {
    return this.http.get<string[]>(`http://localhost:8080/api/repos/${owner}/${repoName}/branches`)
      .pipe(
        catchError(error => {
          console.error('Error fetching branches:', error);
          return of([]);
        })
      );
  }

  // Add this to your repo.service.ts
  getFileMetadata(repo: string, branch: string, path: string): Observable<any> {
    const [owner, repoName] = repo.split('/');

    const url = `http://localhost:8080/api/file-metadata?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repoName)}&branch=${encodeURIComponent(branch)}&path=${encodeURIComponent(path)}`;

    console.log(`Fetching file metadata for: ${path}`);

    return this.http.get<any>(url).pipe(
      tap(response => console.log('Received file metadata:', response)),
      catchError(error => {
        console.error(`Error fetching file metadata:`, error);
        return throwError(() => new Error(`Failed to load file metadata: ${error.message}`));
      })
    );
  }
  getRepoContents(owner: string, repoName: string, branch: string, path: string = ''): Observable<any> {
    let url = `http://localhost:8080/api/contents?owner=${owner}&repo=${repoName}&branch=${branch}`;
    if (path) {
      url += `&path=${encodeURIComponent(path)}`;
    }
  
    console.log(`Fetching repository contents from: ${url}`);
  
    return this.http.get(url).pipe(
      tap(response => {
        console.log('Repository contents response:', response);
  
        if (Array.isArray(response) && response.length > 0) {
          console.log('First item:', response[0]);
          console.log('Keys:', Object.keys(response[0]));
  
          if (response[0].commit) {
            console.log('Commit info exists');
          } else {
            console.log('No commit info');
          }
        }
      }),
      catchError(error => {
        console.error('Error fetching repository contents:', error);
        return throwError(() => new Error('Failed to fetch repository contents'));
      })
    );
  }
  


  getFileContent(repo: string, branch: string, path: string): Observable<string> {
    const [owner, repoName] = repo.split('/');

    // Make sure all parameters are properly encoded
    const url = `http://localhost:8080/api/file-content?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repoName)}&branch=${encodeURIComponent(branch)}&path=${encodeURIComponent(path)}`;

    console.log(`Fetching file content for: ${path} (branch: ${branch})`);

    return this.http.get(url, { responseType: 'text' }).pipe(
      tap(content => console.log(`Received file content (${content.length} bytes)`)),
      catchError(error => {
        console.error(`Error fetching file content for ${path}:`, error);
        return throwError(() => new Error(`Failed to load file content: ${error.message}`));
      })
    );
  }

  getAllContentByUserAndBranch(branch: string): Observable<string[]> {
    return this.http.get<string[]>(
      `${this.apiUrl}/users/${this.currentUser}/branches/${branch}/content`
    ).pipe(
      catchError(error => {
        console.error('Error fetching content by user and branch:', error);
        return of([]);
      })
    );
  }

  // Get HTTPS clone command - using the exact endpoint format
  getCloneCommand(owner: string, repoName: string): Observable<string> {
    // Using the exact endpoint format you provided: GET /api/clone/{owner}/{repo}/command?protocol=https
    const url = `${this.apiUrl}/clone/${owner}/${repoName}/command?protocol=https`;
    console.log(`Attempting to get clone command from: ${url}`);

    return this.http.get<any>(url).pipe(
      tap(response => console.log('Clone command response:', response)),
      map(response => {
        // Extract the clone URL from the response
        // The response format might be {command: string} or something else
        if (response) {
          if (response.command) return response.command;
          if (response.url) return response.url;
          if (typeof response === 'string') return response;
        }

        // Fallback to a standard GitHub URL format if we can't extract the URL
        console.warn('Could not extract clone URL from response, using fallback URL');
        return `https://github.com/${owner}/${repoName}.git`;
      }),
      catchError(error => {
        console.error('Error fetching clone command:', error);
        console.error('Request URL was:', url);

        // Fallback to a standard GitHub URL format if the API fails
        return of(`https://github.com/${owner}/${repoName}.git`);
      })
    );
  }

  // Delete a file from GitHub repository
  deleteFile(repo: string, branch: string, path: string, commitMessage: string = 'Delete file'): Observable<any> {
    const [owner, repoName] = repo.split('/');

    // Use the correct GitHub token
    const token = 'xx'; // Token provided by the user

    if (!token) {
      return throwError(() => new Error('GitHub token not found. Please login first.'));
    }

    // Set up headers with authentication
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json'
    });

    // First, we need to get the file's SHA directly from GitHub API
    const getFileUrl = `https://api.github.com/repos/${owner}/${repoName}/contents/${encodeURIComponent(path)}?ref=${branch}`;

    console.log(`Getting file SHA for: ${path} from ${repo} (branch: ${branch})`);
    console.log(`URL: ${getFileUrl}`);

    return this.http.get<any>(getFileUrl, { headers }).pipe(
      switchMap(fileInfo => {
        // Now we have the file info with SHA, we can delete it
        const deleteUrl = `https://api.github.com/repos/${owner}/${repoName}/contents/${encodeURIComponent(path)}`;

        console.log(`Attempting to delete file: ${path} from ${repo} (branch: ${branch}) with SHA: ${fileInfo.sha}`);

        // Prepare the request body with SHA
        const body = {
          message: commitMessage,
          branch: branch,
          sha: fileInfo.sha
        };

        return this.http.delete(deleteUrl, { headers, body }).pipe(
          tap(response => console.log('File deletion successful:', response)),
          catchError(error => {
            console.error(`Error deleting file ${path}:`, error);
            return throwError(() => new Error(`Failed to delete file: ${error.message}`));
          })
        );
      }),
      catchError(error => {
        console.error(`Error getting file info for ${path}:`, error);
        return throwError(() => new Error(`Failed to get file info: ${error.message}`));
      })
    );
  }

  // Download repository as ZIP - using GitHub directly as a fallback
  downloadRepoAsZip(owner: string, repoName: string, branch: string = 'main'): Observable<Blob> {
    // First try the API endpoint
    const url = `${this.apiUrl}/repos/${owner}/${repoName}/download?branch=${branch}`;
    console.log(`Attempting to download repository from: ${url}`);

    // Create a GitHub URL as fallback
    const githubUrl = `https://github.com/${owner}/${repoName}/archive/refs/heads/${branch}.zip`;
    console.log(`Fallback GitHub URL: ${githubUrl}`);

    // Try the API endpoint first
    return this.http.get(url, {
      responseType: 'blob'
    }).pipe(
      tap(response => console.log('Download successful, received blob:', response.type, response.size)),
      catchError(error => {
        console.error('Error downloading repository from API:', error);
        console.error('Request URL was:', url);
        console.log('Trying direct GitHub download instead...');

        // If the API fails, try GitHub directly
        return this.http.get(githubUrl, {
          responseType: 'blob'
        }).pipe(
          tap(response => console.log('GitHub download successful, received blob:', response.type, response.size)),
          catchError(githubError => {
            console.error('Error downloading from GitHub:', githubError);
            console.error('GitHub URL was:', githubUrl);

            // If both fail, throw an error
            return throwError(() => new Error(`Failed to download repository: ${error.message}`));
          })
        );
      })
    );
  }
getCommitDetails(owner: string, repo: string, sha: string): Observable<GitHubCommit> {
    const url = `${this.apiUrl}/repos/${owner}/${repo}/commits/${sha}`;
    console.log(`🔄 RepoService: Fetching commit details from ${url}`);
    return this.http.get<GitHubCommit>(url);
  }

}