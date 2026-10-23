import { HariKbmType } from './jadwal';

export interface HariKbmFilterState {
  activeHari: HariKbmType;
  viewMode: 'table' | 'card';
  searchQuery: string;
}
