export type BotAvatarType = 'clover' | 'flower' | 'square' | 'ghost';
export type BotAvatarFace = 'eyes' | 'mouth' | 'both' | 'neutral';
export type BotAvatarState = 'default' | 'working' | 'poked';
export type BotAvatarShading = 'plastic' | 'flat';

export interface BotAvatarProps {
  type: BotAvatarType;
  face?: BotAvatarFace;
  color?: string;
  shading?: BotAvatarShading;
  state?: BotAvatarState;
  size?: number;
  className?: string;
  onClick?: () => void;
}
