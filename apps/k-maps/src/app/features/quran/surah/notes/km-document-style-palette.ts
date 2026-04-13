export interface EditorColorOption {
  label: string;
  value: string;
  dot: string;
}

export const TEXT_COLORS: EditorColorOption[] = [
  { label: 'Gray', value: '#9B9A97', dot: '#9B9A97' },
  { label: 'Brown', value: '#A1795B', dot: '#A1795B' },
  { label: 'Orange', value: '#D9730D', dot: '#D9730D' },
  { label: 'Yellow', value: '#CB912F', dot: '#CB912F' },
  { label: 'Green', value: '#2F9E6C', dot: '#2F9E6C' },
  { label: 'Blue', value: '#337EA9', dot: '#337EA9' },
  { label: 'Purple', value: '#8B5CF6', dot: '#8B5CF6' },
  { label: 'Pink', value: '#D44C8D', dot: '#D44C8D' },
  { label: 'Red', value: '#D44C47', dot: '#D44C47' },
];

export const HIGHLIGHT_COLORS: EditorColorOption[] = [
  { label: 'Yellow', value: 'rgba(255,212,0,0.35)', dot: '#FFD400' },
  { label: 'Green', value: 'rgba(0,214,120,0.28)', dot: '#00D678' },
  { label: 'Blue', value: 'rgba(45,170,255,0.28)', dot: '#2DAAFF' },
  { label: 'Pink', value: 'rgba(255,100,180,0.28)', dot: '#FF64B4' },
  { label: 'Purple', value: 'rgba(168,110,255,0.28)', dot: '#A86EFF' },
  { label: 'Orange', value: 'rgba(255,160,50,0.30)', dot: '#FFA032' },
];
