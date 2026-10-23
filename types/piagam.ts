export interface PiagamColumnElement {
  id: string;
  title: string;
  text: string;
  x: number;
  y: number;
  size: number;
  color: string;
  fontFamily: string;
  isBold: boolean;
  align: 'left' | 'center' | 'right';
  textTransform: 'none' | 'uppercase' | 'lowercase';
  show: boolean;
  lockX: boolean;
  lockY: boolean;
  lockSize: boolean;
}

export interface PiagamTemplate {
  id: string;
  name: string;
  orientation: 'landscape' | 'portrait';
  bgType: 'drive' | 'custom';
  driveLink?: string;
  customBgUrl?: string;
  columns: PiagamColumnElement[];
}
