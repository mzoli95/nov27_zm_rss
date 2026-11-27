import { createActionGroup, emptyProps, props } from '@ngrx/store';

export enum SourceKind {
  Rss = 'Rss',
  Usgs = 'Usgs',
}
export interface SourceTopic {
  topic: string;
  keywords: string;
}
export interface SourceInput {
  name: string;
  url: string;
  kind: SourceKind;
  topics: SourceTopic[];
}
export interface NewsSource extends SourceInput {
  id: number;
  lastSuccess: string | null;
  status: string | null;
}
export interface SourcePage {
  items: NewsSource[];
  page: number;
  total: number;
  pageSize: number;
}
export const sourcesActions = createActionGroup({
  source: 'News sources',
  events: {
    Load: props<{ page: number }>(),
    'Editor opened': emptyProps(),
    Save: props<{ source: SourceInput; id: number | null; page: number }>(),
    Test: props<{ source: SourceInput }>(),
    Tested: props<{ count: number }>(),
    Delete: props<{ id: number; page: number }>(),
    Run: props<{ id: number; page: number }>(),
    Loaded: props<{ topics: string[]; sources: SourcePage; message: string; saved: boolean }>(),
    Failed: props<{ message: string }>(),
  },
});
