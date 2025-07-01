import { Component, Input, OnInit } from "@angular/core";
import { Router, ActivatedRoute } from "@angular/router";
import { HttpClient } from "@angular/common/http";
import { GithubTokenService } from "../../services/github-token.service";

@Component({
  selector: "app-repo-form",
  templateUrl: "./repo-form.component.html",
  styleUrls: ["./repo-form.component.css"],
})
export class RepoFormComponent implements OnInit {
  @Input()
  classid: string | null = null;
  specialtyId?: number;
  levelId?: number;

  user = {
    username: "maramoueslati", 
    avatarUrl: "https://avatars.githubusercontent.com/u/000000?v=4"
  }

  err = "";

  repo = {
    name: "",
    description: "",
    visibility: "public",
    auto_init: false,
    gitignore_template: "",
    ownerName: "maramoueslati"
  }

  constructor(
    private router: Router,
    private http: HttpClient,
    private route: ActivatedRoute,
    private githubTokenService: GithubTokenService
  ) {}

  ngOnInit() {
    const urlParts = this.router.url.split('/');
    const createRepoIndex = urlParts.indexOf('create_repo');

    if (createRepoIndex !== -1 && urlParts.length > createRepoIndex + 1) {
      const rawId = urlParts[createRepoIndex + 1];
      const classIdFromUrl = rawId.split('%')[0];
      this.classid = classIdFromUrl;
    }
    console.log("*********************kkkk", this.classid);
  }

  private getAuthHeaders() {
    return {
      'GitHub-Token': this.githubTokenService.getToken()
    };
  }

  onSubmit() {
    console.log("Visibility selected:", this.repo.visibility);
    console.log("ClassId before submit:", this.classid);

    const payload = {
      name: this.repo.name,
      description: this.repo.description,
      private: this.repo.visibility === "private",
      auto_init: this.repo.auto_init,
      gitignore_template: this.repo.gitignore_template === "None" ? null : this.repo.gitignore_template,
      ownerName: this.repo.ownerName,
      classId: this.classid
    }

    console.log("Sending payload:", payload);

    this.http.post("/api/github/create-repo", payload, {
      headers: this.getAuthHeaders()
    }).subscribe({
      next: (response: any) => {
        console.log("Repository created successfully:", response);
        this.router.navigate(['/repo', this.user.username, this.repo.name]);
      },
      error: (error) => {
        console.error("Error creating repository:", error);
        this.err = error.error?.message || "Failed to create repository";
      }
    });
  }

  goBack() {
    this.router.navigate(["/students", this.classid]);
  }
}
