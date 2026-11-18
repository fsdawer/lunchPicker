import Svg, { Circle, Path, Rect } from 'react-native-svg';

const palettes = [
  { background: '#FDE8D7', plate: '#FFF9F3', bowl: '#BD5A33', soup: '#ECA66A' },
  { background: '#E6F0E8', plate: '#FAFCF7', bowl: '#4B7C67', soup: '#D0B78B' },
  { background: '#EEE9F5', plate: '#FCFAFF', bowl: '#75648C', soup: '#DDBB91' },
] as const;

export function RestaurantThumbnail({ restaurantId, size = 96 }: { restaurantId: number; size?: number }) {
  const palette = palettes[Math.abs(restaurantId) % palettes.length];

  return (
    <Svg width={size} height={size} viewBox="0 0 96 96" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Rect width="96" height="96" rx="16" fill={palette.background} />
      <Circle cx="48" cy="54" r="33" fill={palette.plate} />
      <Path d="M28 52c0 14 9 24 20 24s20-10 20-24H28Z" fill={palette.bowl} />
      <Path d="M29 52c0-6 8-10 19-10s19 4 19 10-8 10-19 10-19-4-19-10Z" fill={palette.soup} />
      <Path d="M35 52c4-2 8-2 12 0 4 2 8 2 13-1" fill="none" stroke={palette.plate} strokeWidth="3" strokeLinecap="round" />
      <Path d="M38 21c-5 5 3 8-1 13M49 18c-5 5 3 8-1 13M60 21c-5 5 3 8-1 13" fill="none" stroke={palette.bowl} strokeWidth="2.5" strokeLinecap="round" opacity="0.65" />
    </Svg>
  );
}
