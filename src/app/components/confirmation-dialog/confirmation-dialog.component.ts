import { Component, Inject, OnInit } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";

// Enhanced Dialog Data Interface
export interface DialogData {
  title: string;
  message?: string;
  content?: string;
  details?: string;
  type?: 'info' | 'warning' | 'error' | 'success';
  icon?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmIcon?: string;
  cancelIcon?: string;
  confirmDisabled?: boolean;
  loadingText?: string;
  allowClose?: boolean;
}

// Enhanced Dialog Component
@Component({
  selector: 'app-confirmation-dialog',
  templateUrl: './confirmation-dialog.component.html',
  styleUrls: ['./confirmation-dialog.component.css']
})
export class ConfirmationDialogComponent implements OnInit {
  dialogId: string;
  isLoading = false;

  constructor(
    public dialogRef: MatDialogRef<ConfirmationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {
    this.dialogId = Math.random().toString(36).substr(2, 9);
    
    // Prevent closing if specified
    if (data.allowClose === false) {
      this.dialogRef.disableClose = true;
    }
  }

  ngOnInit(): void {
    // Set default icons based on type
    if (!this.data.icon && this.data.type) {
      const iconMap = {
        'info': 'info',
        'warning': 'warning',
        'error': 'error',
        'success': 'check_circle'
      };
      this.data.icon = iconMap[this.data.type];
    }
  }

  async onConfirm(): Promise<void> {
    if (this.data.type === 'warning' || this.data.type === 'error') {
      this.isLoading = true;
      
      // Simulate async operation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      this.isLoading = false;
    }
    
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}