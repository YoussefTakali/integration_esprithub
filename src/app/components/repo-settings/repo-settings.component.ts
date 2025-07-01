import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { GithubTokenService } from '../../services/github-token.service';

@Component({
  selector: 'app-repo-settings',
  templateUrl: './repo-settings.component.html',
  styleUrls: ['./repo-settings.component.css']
})
export class RepoSettingsComponent {
  activeTab: 'general' | 'collaborators' | 'delete' | 'branches' | 'commits' = 'general';
  ownerName: string = '';
  repoName: string = '';
  showAddCollab = false;

  collaborators1: any[] = [];
  invitations: any[] = [];
  branches: any[] = [];
  commits: any[] = [];
  filteredCollaborators: any[] = [];
  newBranchName = '';
  branchSearch = '';
  showCreateBranchInput = false;
  showDeleteConfirm = false;
  deleteInput = '';
  showRemoveBranchModal = false;
  selectedBranchToRemove: string | null = null;
  showRemoveCollabModal = false;
  selectedCollab: any = null;
  showRemoveInviteModal = false;
  selectedInvite: any = null;
  collaborator = '';
  inviteError = '';
  SuccessError = '';
  branche_add_success = '';
  branche_add_error = '';
  branche_add_success_2 = '';
  branche_add_error_2 = '';
  branche_remove_success = '';
  branche_remove_error = '';
  defaultBranch = 'main';
  branchSearchTerm = '';

  constructor(
    private act: ActivatedRoute,
    private http: HttpClient,
    private router: Router,
    private githubTokenService: GithubTokenService
  ) {}

  ngOnInit() {
    this.fillRepoInfoFromUrl(this.router.url);
    this.getCollaborators();
    setTimeout(() => this.getBranches(), 0);
  }

  private getAuthHeaders() {
    return {
      'GitHub-Token': this.githubTokenService.getToken()
    };
  }

  fillRepoInfoFromUrl(url: string) {
    const match = url.match(/^\/repo\/([^\/]+)\/([^\/]+)/);
    if (match) {
      this.ownerName = match[1];
      this.repoName = match[2];
    }
  }

  getCollaborators() {
    this.http.get<any[]>('/api/github/list-collaborators', {
      params: { owner: this.ownerName, repo: this.repoName },
      headers: this.getAuthHeaders()
    }).subscribe(data => {
      this.collaborators1 = data;
    });

    this.http.get<any[]>('/api/github/list-invitations', {
      params: { owner: this.ownerName, repo: this.repoName },
      headers: this.getAuthHeaders()
    }).subscribe(invitations => {
      this.invitations = invitations;
    });
  }

  addCollaborator() {
    if (this.collaborator.includes('@')) {
      this.inviteError = 'Inviting by email is not supported. Please enter a GitHub username.';
      return;
    }
    if (this.collaborator === this.ownerName) {
      this.inviteError = 'You cannot add yourself as a collaborator.';
      this.collaborator = '';
      return;
    }

    this.http.post('/api/github/add-collaborator', {
      owner: this.ownerName,
      repo: this.repoName,
      username: this.collaborator,
      permission: 'push'
    }, { headers: this.getAuthHeaders() }).subscribe(() => {
      this.SuccessError = `${this.collaborator} was added successfully`;
      this.getCollaborators();
    });
  }

  remove_collab(username: string) {
    this.http.delete('/api/github/remove-collaborator', {
      params: { owner: this.ownerName, repo: this.repoName, username },
      headers: this.getAuthHeaders()
    }).subscribe(() => {
      this.getCollaborators();
    });
  }

  remove_invitation(invitation: any) {
    this.http.delete('/api/github/remove-invitation', {
      params: { owner: this.ownerName, repo: this.repoName, invitationId: invitation.id },
      headers: this.getAuthHeaders()
    }).subscribe(() => {
      this.getCollaborators();
    });
  }

  getBranches() {
    this.http.get<any[]>('/api/github/list-branches', {
      params: { owner: this.ownerName, repo: this.repoName },
      headers: this.getAuthHeaders()
    }).subscribe(data => {
      this.branches = data;
    });
  }

  addBranchForCollaborators() {
    this.filteredCollaborators = this.collaborators1.filter(c => c.login !== this.ownerName);

    this.http.get<any>('/api/github/latest-sha', {
      params: { owner: this.ownerName, repo: this.repoName, baseBranch: 'main' },
      headers: this.getAuthHeaders()
    }).subscribe(shaRes => {
      const sha = shaRes.object.sha;
      for (const collaborator of this.filteredCollaborators) {
        const username = collaborator.login;
        this.http.get<boolean>('/api/github/branch-exists', {
          params: { owner: this.ownerName, repo: this.repoName, branch: username },
          headers: this.getAuthHeaders()
        }).subscribe(exists => {
          if (!exists) {
            this.http.post('/api/github/create-branch', null, {
              params: { owner: this.ownerName, repo: this.repoName, newBranch: username, sha },
              headers: this.getAuthHeaders()
            }).subscribe(() => {
              this.branche_add_success = `Branch created for ${username}`;
              this.getBranches();
            });
          } else {
            this.branche_add_error = `Branch already exists for ${username}`;
          }
        });
      }
    });
  }

  createBranch() {
    if (!this.newBranchName) return;

    this.http.get<any>('/api/github/latest-sha', {
      params: { owner: this.ownerName, repo: this.repoName, baseBranch: 'main' },
      headers: this.getAuthHeaders()
    }).subscribe(shaRes => {
      const sha = shaRes.object.sha;

      this.http.post('/api/github/create-branch', null, {
        params: { owner: this.ownerName, repo: this.repoName, newBranch: this.newBranchName, sha },
        headers: this.getAuthHeaders()
      }).subscribe(() => {
        this.branche_add_success_2 = `Branch ${this.newBranchName} was created successfully`;
        this.getBranches();
        this.toggleCreateBranch();
      }, () => {
        this.branche_add_error_2 = `Error creating branch ${this.newBranchName}`;
      });
    });
  }

  confirmRemoveBranch() {
    if (!this.selectedBranchToRemove) return;

    this.http.delete('/api/github/delete-branch', {
      params: { owner: this.ownerName, repo: this.repoName, branch: this.selectedBranchToRemove },
      headers: this.getAuthHeaders()
    }).subscribe(() => {
      this.branche_remove_success = `${this.selectedBranchToRemove} was deleted successfully`;
      this.getBranches();
      this.closeRemoveBranchModal();
    }, () => {
      this.branche_remove_error = `Error deleting branch ${this.selectedBranchToRemove}`;
      this.closeRemoveBranchModal();
    });
  }

  getBranchCommits(branchName: string) {
    this.http.get<any[]>('/api/github/branch-commits', {
      params: { owner: this.ownerName, repo: this.repoName, branch: branchName },
      headers: this.getAuthHeaders()
    }).subscribe(data => {
      this.commits = data;
    });
  }

  toggleCreateBranch() {
    this.showCreateBranchInput = !this.showCreateBranchInput;
    this.newBranchName = '';
  }

  openRemoveBranchModal(branchName: string) {
    this.selectedBranchToRemove = branchName;
    this.showRemoveBranchModal = true;
  }

  closeRemoveBranchModal() {
    this.selectedBranchToRemove = null;
    this.showRemoveBranchModal = false;
  }

  openRemoveCollabModal(c: string) {
    this.selectedCollab = c;
    this.showRemoveCollabModal = true;
  }

  closeCollabModal() {
    this.selectedCollab = null;
    this.showRemoveCollabModal = false;
  }

  confirmRemoveCollab() {
    if (this.selectedCollab) {
      this.remove_collab(this.selectedCollab);
      this.closeCollabModal();
    }
  }

  openRemoveInviteModal(invite: any) {
    this.selectedInvite = invite;
    this.showRemoveInviteModal = true;
  }

  closeRemoveInviteModal() {
    this.selectedInvite = null;
    this.showRemoveInviteModal = false;
  }

  confirmRemoveInvite() {
    if (this.selectedInvite) {
      this.remove_invitation(this.selectedInvite);
      this.closeRemoveInviteModal();
    }
  }

  filteredBranches() {
    return this.branches.filter(branch =>
      branch.name !== this.defaultBranch &&
      (!this.branchSearch || branch.name.includes(this.branchSearch))
    );
  }

  setActiveTab() {
    this.activeTab = 'branches';
    this.getBranches();
  }

  confirmDelete() {
    alert('Repository deleted!');
    this.showDeleteConfirm = false;
    this.deleteInput = '';
  }
  updateRepoName() {
  console.log('Update repo name called. New name:', this.repoName);
  // TODO: Add your logic to update the repo name via API
}

}
