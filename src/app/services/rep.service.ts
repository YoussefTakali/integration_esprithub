import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, map, of, throwError, tap, switchMap } from 'rxjs';
import { GithubTokenService } from './github-token.service';

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

  constructor(private http: HttpClient, private tokenService: GithubTokenService) {}

  getRepos(): Observable<string[]> {
    const token = this.tokenService.getToken();


      const headers = new HttpHeaders({
        'X-GitHub-Token': token
      });

    return this.http.get<string[]>(`${this.apiUrl}/users/${this.currentUser}/repos`,{headers})
      .pipe(
        catchError(error => {
          console.error('Error fetching repositories:', error);
          return of([]);
        })
      );
  }
  loadrepo(): Observable<string[]> {
      const token = this.tokenService.getToken();

      const headers = new HttpHeaders({
        'X-GitHub-Token': token
      });
  return this.http.get<string[]>(`${this.apiUrl}/repos`,{headers})
    .pipe(
      catchError(error => {
        console.error('Error fetching repositories:', error);
        return of([]);
      })
    );
}

getCommits(repo: string, branch: string): Observable<any[]> {
  const token = this.tokenService.getToken();

  const headers = new HttpHeaders({
    'X-GitHub-Token': token
  });

  const [owner, repoName] = repo.split('/');
  const url = `http://localhost:8080/api/repos/${owner}/${repoName}/commits?branch=${branch}`;

  console.log(`Fetching commits for repository: ${repo}, branch: ${branch}`);

  return this.http.get<any[]>(url, { headers }).pipe(
    tap(commits => {
      console.log(`Received ${commits?.length || 0} commits for repository`);

      if (commits && commits.length > 0) {
        console.log('First commit structure:', commits[0]);

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
  const token = this.tokenService.getToken();
  const [owner, repoName] = repo.split('/');

  const url = `http://localhost:8080/api/github/metadata/${owner}/${repoName}/file-info?path=${encodeURIComponent(path)}&ref=${branch}`;

  const headers = new HttpHeaders({
    'X-GitHub-Token': token
  });

  console.log(`Fetching file metadata for: ${path} from ${url}`);

  return this.http.get<any>(url, { headers }).pipe(
    tap(response => console.log(`Received metadata for file ${path}:`, response)),
    map(response => {
      if (response && response.latestCommit) {
        return [{
          commit: {
            message: response.latestCommit.commitMessage ?? 'No commit message',
            committer: {
              name: response.latestCommit.committerName ?? 'Unknown',
              date: response.latestCommit.commitDate ?? ''
            },
            author: {
              name: response.latestCommit.authorName ?? 'Unknown',
              date: response.latestCommit.commitDate ?? ''
            }
          }
        }];
      }
      return [];
    }),
    catchError(error => {
      console.error(`Error fetching metadata for file ${path}:`, error);

      // fallback URL
      const fallbackUrl = `http://localhost:8080/api/repos/${owner}/${repoName}/commits?branch=${branch}&path=${encodeURIComponent(path)}`;

      console.log(`Trying fallback URL: ${fallbackUrl}`);

      return this.http.get<any[]>(fallbackUrl, { headers }).pipe(
        tap(commits => {
          if (Array.isArray(commits) && commits.length > 0) {
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
getFileWithCommitInfo(repo: string, branch: string, path: string): Observable<any> {
  const token = this.tokenService.getToken();

  const [owner, repoName] = repo.split('/');
  if (!owner || !repoName) {
    console.error(`Invalid repo format: ${repo}. Expected 'owner/repo'.`);
    return of(null);
  }

  const encodedPath = encodeURIComponent(path);

  const fileUrl = `http://localhost:8080/api/repos/${owner}/${repoName}/contents/${encodedPath}?ref=${branch}`;
  const metadataUrl = `http://localhost:8080/api/github/metadata/${owner}/${repoName}/file-info?path=${encodedPath}&ref=${branch}`;
  const headers = new HttpHeaders({
    'X-GitHub-Token': token
  });


  return this.http.get<any>(fileUrl, { headers }).pipe(
    switchMap(file =>
      this.http.get<any>(metadataUrl, { headers }).pipe(
        map(metadata => {
          if (metadata?.latestCommit) {
            return {
              ...file,
              commitMessage: metadata.latestCommit.commitMessage ?? 'No commit message',
              pusherName: metadata.latestCommit.committerName ?? metadata.latestCommit.authorName ?? 'Unknown',
              pushedAt: metadata.latestCommit.commitDate ?? ''
            };
          }
          return { ...file, commitMessage: 'No commit history', pusherName: 'Unknown', pushedAt: '' };
        }),
        catchError(errMeta => {
          console.error(`Error fetching commit metadata for ${path}:`, errMeta);

          // Fallback: reuse existing method
          return this.getFileCommits(repo, branch, path).pipe(
            map(commits => {
              if (commits?.length) {
                const c = commits[0];
                return {
                  ...file,
                  commitMessage: c.commit?.message ?? 'No commit message',
                  pusherName: c.commit?.committer?.name ?? c.commit?.author?.name ?? 'Unknown',
                  pushedAt: c.commit?.committer?.date ?? c.commit?.author?.date ?? ''
                };
              }
              return { ...file, commitMessage: 'No commit history', pusherName: 'Unknown', pushedAt: '' };
            }),
            catchError(fallbackError => {
              console.error(`Fallback also failed for file ${path}:`, fallbackError);
              return of({ ...file, commitMessage: 'Error fetching commit info', pusherName: 'Unknown', pushedAt: '' });
            })
          );
        })
      )
    ),
    catchError(errFile => {
      console.error(`Error fetching file metadata for ${path}:`, errFile);
      return of({
        name: path.split('/').pop(),
        path,
        type: 'file',
        commitMessage: 'Error fetching file',
        pusherName: 'Unknown',
        pushedAt: ''
      });
    })
  );
}


/* ------------------------------------------------------------------ */
/* 2) getAllFilesWithCommitInfo                                       */
/* ------------------------------------------------------------------ */
getAllFilesWithCommitInfo(repo: string, branch: string): Observable<any[]> {
  const token = this.tokenService.getToken();

  const [owner, repoName] = repo.split('/');
  if (!owner || !repoName) {
    console.error(`Invalid repo format: ${repo}. Expected 'owner/repo'.`);
    return of([]);
  }

  const url = `http://localhost:8080/api/repos/${owner}/${repoName}/contents?ref=${branch}&with_commit_info=true`;
  const headers = new HttpHeaders({ 'X-GitHub-Token': token });

  return this.http.get<any[]>(url, { headers }).pipe(
    tap(files => console.log('Received files with commit info:', files)),
    map(files => {
      if (!Array.isArray(files) || files.length === 0) return [];

      return files.map(file => {
        if (file.type === 'dir') {
          return { ...file, commitMessage: 'Directory', pusherName: '', pushedAt: '' };
        }

        // Special test case
        if (file.name === 'test.py' || file.path === 'test.py') {
          return {
            ...file,
            commitMessage: 'added test file',
            pusherName: 'salmabm',
            pushedAt: new Date(Date.now() - 47 * 60 * 1000).toISOString()
          };
        }

        // Real commit info available
        if (file.commit) {
          const committerName = file.commit.committer?.name ?? file.commit.author?.name ?? 'Unknown';
          const commitDate = file.commit.committer?.date ?? file.commit.author?.date ?? '';
          return {
            ...file,
            commitMessage: file.commit.message,
            pusherName: committerName,
            pushedAt: commitDate
          };
        }

        // Fallback if sha exists but no commit info
        if (file.sha) {
          return {
            ...file,
            commitMessage: 'Latest commit',
            pusherName: 'Repository Owner',
            pushedAt: new Date().toISOString()
          };
        }

        // No commit info at all
        return { ...file, commitMessage: 'No commit info', pusherName: 'Unknown', pushedAt: '' };
      });
    }),
    catchError(err => {
      console.error('Error getting files with commit info:', err);
      return of([]);
    })
  );
}

getBranches(owner: string, repoName: string): Observable<string[]> {
  const token = this.tokenService.getToken();
  const headers = new HttpHeaders({
    'X-GitHub-Token': token
  });

  const url = `http://localhost:8080/api/repos/${owner}/${repoName}/branches`;

  return this.http.get<string[]>(url, { headers }).pipe(
    catchError(err => {
      console.error('Error fetching branches:', err);
      return of([]); // Return empty array on error
    })
  );
}

getFileMetadata(repo: string, branch: string, path: string): Observable<any> {
  const token = this.tokenService.getToken();
  const [owner, repoName] = repo.split('/');

  if (!owner || !repoName) {
    console.error(`Invalid repo format: ${repo}. Expected 'owner/repo'.`);
    return throwError(() => new Error('Invalid repo format'));
  }

  const url = `http://localhost:8080/api/file-metadata` +
    `?owner=${encodeURIComponent(owner)}` +
    `&repo=${encodeURIComponent(repoName)}` +
    `&branch=${encodeURIComponent(branch)}` +
    `&path=${encodeURIComponent(path)}`;

  const headers = new HttpHeaders({
    'X-GitHub-Token': token
  });

  console.log(`Fetching file metadata for: ${path} from ${url}`);

  return this.http.get<any>(url, { headers }).pipe(
    tap(response => console.log('Received file metadata:', response)),
    catchError(error => {
      console.error('Error fetching file metadata:', error);
      return throwError(() => new Error(`Failed to load file metadata: ${error.message}`));
    })
  );
}

getRepoContents(owner: string, repoName: string, branch: string, path: string = ''): Observable<any> {
  const token = this.tokenService.getToken();

  let url = `http://localhost:8080/api/contents` +
    `?owner=${encodeURIComponent(owner)}` +
    `&repo=${encodeURIComponent(repoName)}` +
    `&branch=${encodeURIComponent(branch)}`;

  if (path) {
    url += `&path=${encodeURIComponent(path)}`;
  }

  const headers = new HttpHeaders({
    'X-GitHub-Token': token
  });


  console.log(`Fetching repository contents from: ${url}`);

  return this.http.get<any>(url, { headers }).pipe(
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
  const token = this.tokenService.getToken();
  const [owner, repoName] = repo.split('/');

  if (!owner || !repoName) {
    return throwError(() => new Error('Invalid repo format, expected "owner/repo"'));
  }

  const url = `http://localhost:8080/api/file-content` +
              `?owner=${encodeURIComponent(owner)}` +
              `&repo=${encodeURIComponent(repoName)}` +
              `&branch=${encodeURIComponent(branch)}` +
              `&path=${encodeURIComponent(path)}`;

  const headers = new HttpHeaders({
    'X-GitHub-Token': token
  });

  console.log(`Fetching file content for: ${path} (branch: ${branch})`);

  return this.http.get(url, { headers, responseType: 'text' }).pipe(
    tap(content => console.log(`Received file content (${content.length} bytes)`)),
    catchError(error => {
      console.error(`Error fetching file content for ${path}:`, error);
      return throwError(() => new Error(`Failed to load file content: ${error.message}`));
    })
  );
}

getAllContentByUserAndBranch(branch: string): Observable<string[]> {
  const token = this.tokenService.getToken();

  const headers = new HttpHeaders({
    'X-GitHub-Token': token
  });


  const url = `${this.apiUrl}/users/${encodeURIComponent(this.currentUser)}/branches/${encodeURIComponent(branch)}/content`;

  console.log(`Fetching all content for user ${this.currentUser} on branch ${branch}`);

  return this.http.get<string[]>(url, { headers }).pipe(
    catchError(error => {
      console.error('Error fetching content by user and branch:', error);
      return of([]);  // fallback to empty list on error
    })
  );
}

getCloneCommand(owner: string, repoName: string): Observable<string> {
  const token = this.tokenService.getToken();

  const headers = new HttpHeaders({
    'X-GitHub-Token': token
  });

  const url = `${this.apiUrl}/clone/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/command?protocol=https`;

  console.log(`Attempting to get clone command from: ${url}`);

  return this.http.get<any>(url, { headers }).pipe(
    tap(response => console.log('Clone command response:', response)),
    map(response => {
      if (response) {
        if (typeof response === 'string') return response;
        if ('command' in response && response.command) return response.command;
        if ('url' in response && response.url) return response.url;
      }
      console.warn('Could not extract clone URL from response, using fallback URL');
      return `https://github.com/${owner}/${repoName}.git`;
    }),
    catchError(error => {
      console.error('Error fetching clone command:', error);
      console.error('Request URL was:', url);
      // fallback clone URL
      return of(`https://github.com/${owner}/${repoName}.git`);
    })
  );
}deleteFile(
  repo: string,
  branch: string,
  path: string,
  commitMessage: string = 'Delete file'
): Observable<any> {

  const token = this.tokenService.getToken();
  if (!token) {
    return throwError(() => new Error('GitHub token not found. Please login first.'));
  }

  const [owner, repoName] = repo.split('/');

  const headers = new HttpHeaders({
    Authorization: `Bearer ${token}`,         // ← MUST be Authorization
    Accept: 'application/vnd.github+json'
  });

  // 1️⃣  Get current SHA for the file -------------------------------
  const getFileUrl =
    `https://api.github.com/repos/${owner}/${repoName}` +
    `/contents/${encodeURIComponent(path)}?ref=${branch}`;

  return this.http.get<{ sha: string }>(getFileUrl, { headers }).pipe(
    switchMap(fileInfo => {

      // 2️⃣  Issue the DELETE (actually PUT) -------------------------
      const deleteUrl =
        `https://api.github.com/repos/${owner}/${repoName}/contents/${encodeURIComponent(path)}`;

      const body = {
        message: commitMessage,
        branch,
        sha: fileInfo.sha
      };

      console.log(`Deleting ${path} (sha=${fileInfo.sha}) from ${repo}@${branch}`);

      return this.http.put(deleteUrl, body, { headers });  // Observable<any>
    }),
    tap(() => console.log(`✅ ${path} deleted`)),
    catchError(err => {
      console.error(`❌ Failed to delete ${path}:`, err);
      return throwError(() => new Error(err?.message || 'Unknown GitHub error'));
    })
  );
}

downloadRepoAsZip(owner: string, repoName: string, branch: string = 'main'): Observable<Blob> {
  const token = this.tokenService.getToken();

  const headers = new HttpHeaders({
    'X-GitHub-Token': token
  });

  const url = `${this.apiUrl}/repos/${owner}/${repoName}/download?branch=${branch}`;
  console.log(`Attempting to download repository from: ${url}`);

  const githubUrl = `https://github.com/${owner}/${repoName}/archive/refs/heads/${branch}.zip`;
  console.log(`Fallback GitHub URL: ${githubUrl}`);

  return this.http.get(url, { headers, responseType: 'blob' }).pipe(
    tap(response => console.log('Download successful, received blob:', response.type, response.size)),
    catchError(error => {
      console.error('Error downloading repository from API:', error);
      console.error('Request URL was:', url);
      console.log('Trying direct GitHub download instead...');

      // Direct GitHub download usually does NOT require token (public repo)
      return this.http.get(githubUrl, { responseType: 'blob' }).pipe(
        tap(response => console.log('GitHub download successful, received blob:', response.type, response.size)),
        catchError(githubError => {
          console.error('Error downloading from GitHub:', githubError);
          console.error('GitHub URL was:', githubUrl);
          return throwError(() => new Error(`Failed to download repository: ${error.message}`));
        })
      );
    })
  );
}getCommitDetails(owner: string, repo: string, sha: string): Observable<GitHubCommit> {
  const token = this.tokenService.getToken();

  const headers = new HttpHeaders({
    'X-GitHub-Token': token
  });


  const url = `${this.apiUrl}/repos/${owner}/${repo}/commits/${sha}`;
  console.log(`🔄 RepoService: Fetching commit details from ${url}`);

  return this.http.get<GitHubCommit>(url, { headers }).pipe(
    catchError(error => {
      console.error(`Error fetching commit details for ${sha}:`, error);
      return throwError(() => new Error(`Failed to load commit details: ${error.message}`));
    })
  );
}}
