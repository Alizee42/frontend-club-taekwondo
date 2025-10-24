import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'groupBy',
  standalone: true
})
export class GroupByPipe implements PipeTransform {
  transform(array: any[], key: string): Array<{ key: string, items: any[] }> {
    if (!Array.isArray(array)) return [];
    const groups: { [key: string]: any[] } = {};
    array.forEach(item => {
      const groupKey = item[key] || '';
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(item);
    });
    return Object.keys(groups).map(k => ({ key: k, items: groups[k] }));
  }
}
