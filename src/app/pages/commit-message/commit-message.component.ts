import { Component, Input, Output, EventEmitter } from "@angular/core"

@Component({
  selector: "app-commit-message",
  templateUrl: "./commit-message.component.html",
  styleUrls: ["./commit-message.component.css"],
})
export class CommitMessageComponent {
  @Input() selectedFiles: File[] = []
  commitMessage = ""

  // Use functions for callbacks when used as a dynamic component
  submitCommit: (message: string) => void = () => {}
  cancel: () => void = () => {}

  // Use event emitters when used as a regular component
  @Output() onSubmit = new EventEmitter<{ message: string; files: File[] }>()
  @Output() onCancel = new EventEmitter<void>()

  // Removed the unused constructor with Router and HttpClient

  submit(): void {
    if (!this.commitMessage.trim()) {
      alert("Commit message cannot be empty.")
      return
    }

    // Use the callback provided by the parent component
    if (typeof this.submitCommit === "function") {
      console.log("Using parent callback for submit")
      this.submitCommit(this.commitMessage)
    } else {
      console.log("Using component event emitter for submit")
      this.onSubmit.emit({ message: this.commitMessage, files: this.selectedFiles })
    }
  }

  closeCommitPopup(): void {
    this.closeModal()
  }

  closeModal(): void {
    // When used as a dynamic component
    if (typeof this.cancel === "function") {
      console.log("Using parent callback for cancel")
      this.cancel()
    }
    // When used as a regular component
    else {
      console.log("Using component event emitter for cancel")
      this.onCancel.emit()
    }
  }

  // Helper method to format file sizes for display
  formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes"

    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }
}
