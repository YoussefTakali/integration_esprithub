import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'timeAgo'
})
export class TimeAgoPipe implements PipeTransform {

 
 

    transform(value: any): string {
      if (!value) return '';
  
      const time = typeof value === 'string' ? new Date(value) : value;
      const now = new Date();
      const seconds = Math.floor((+now - +time) / 1000);
  
      if (seconds < 29) return 'Just now';
      const intervals: { [key: string]: number } = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60,
        second: 1
      };
  
      for (const unit in intervals) {
        const value = Math.floor(seconds / intervals[unit]);
        if (value >= 1) return `${value} ${unit}${value > 1 ? 's' : ''} ago`;
      }
      return '';
    }
  }

