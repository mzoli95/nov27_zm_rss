import { createActionGroup, emptyProps, props } from '@ngrx/store';

export enum SourceKind {
  Rss = 'Rss',
  Usgs = 'Usgs',
}
export interface SourceInput {
  name: string;
  url: string;
  kind: SourceKind;
  topic: string;
  keywords: string;
}
export interface NewsSource {
  id: number;
  name: string;
  url: string;
  kind: SourceKind;
  lastSuccess: string | null;
  status: string | null;
  topics: { topic: string; keywords: string }[];
}
export const sourcesActions = createActionGroup({
  source: 'News sources',
  events: {
    Load: emptyProps(),
    Save: props<{ source: SourceInput }>(),
    Run: props<{ id: number }>(),
    Loaded: props<{ topics: string[]; sources: NewsSource[]; message: string }>(),
    Failed: props<{ message: string }>(),
  },
});
