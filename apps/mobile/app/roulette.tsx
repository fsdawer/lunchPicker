import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoulette, type Candidate } from '../src/features/roulette/RouletteContext';
import { labelPosition, nextRotation, sectorPath } from '../src/features/roulette/wheel';

const colors = ['#C2410C', '#FB923C', '#F59E0B', '#84CC16', '#0D9488', '#3B82F6', '#8B5CF6', '#EC4899'];

export default function RouletteScreen() {
  const { candidates, removeCandidate } = useRoulette();
  const [winner, setWinner] = useState<Candidate | null>(null);
  const [spinning, setSpinning] = useState(false);
  const rotation = useRef(0);
  const animatedRotation = useRef(new Animated.Value(0)).current;

  useEffect(() => setWinner(null), [candidates]);

  const spin = () => {
    if (spinning || candidates.length < 2) return;
    const index = Math.floor(Math.random() * candidates.length);
    const selected = candidates[index];
    const target = nextRotation(rotation.current, index, candidates.length);
    setWinner(null);
    setSpinning(true);
    AccessibilityInfo.isReduceMotionEnabled().catch(() => false).then((reduceMotion) => {
      Animated.timing(animatedRotation, { toValue: target, duration: reduceMotion ? 0 : 3400,
        easing: Easing.out(Easing.cubic), useNativeDriver: true })
        .start(({ finished }) => {
          if (finished) {
            rotation.current = target;
            setWinner(selected);
          }
          setSpinning(false);
        });
    });
  };

  const rotationStyle = animatedRotation.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'], extrapolate: 'extend' });

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="뒤로 가기" onPress={() => router.canGoBack() ? router.back() : router.replace('/' as Href)}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </Pressable>
        <Text style={styles.headerTitle}>오늘의 메뉴 돌림판</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.description}>식당 상세에서 후보를 담고, 돌림판으로 한 곳을 골라보세요.</Text>
        <View style={styles.wheelArea}>
          <View style={styles.pointer} />
          <Animated.View style={{ transform: [{ rotate: rotationStyle }] }}>
            <Svg width={300} height={300} viewBox="0 0 300 300" accessibilityLabel="식당 후보 돌림판">
              {candidates.length === 1 ? <Circle cx={150} cy={150} r={140} fill={colors[0]} /> : candidates.map((candidate, index) => {
                return <Path key={candidate.id} d={sectorPath(index, candidates.length)} fill={colors[index]} stroke="#FFFFFF" strokeWidth={2} />;
              })}
              {candidates.map((candidate, index) => {
                const position = candidates.length === 1 ? { x: 150, y: 150 } : labelPosition(index, candidates.length);
                return <SvgText key={candidate.id} x={position.x} y={position.y} fill="#FFFFFF" fontSize={12}
                  fontWeight="700" textAnchor="middle" alignmentBaseline="middle">{candidate.name.length > 8 ? `${candidate.name.slice(0, 8)}…` : candidate.name}</SvgText>;
              })}
              {candidates.length === 0 ? <Circle cx={150} cy={150} r={140} fill="#F3E8E1" /> : null}
              <Circle cx={150} cy={150} r={14} fill="#FFFFFF" />
            </Svg>
          </Animated.View>
        </View>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: candidates.length < 2 || spinning }}
          disabled={candidates.length < 2 || spinning} onPress={spin}
          style={({ pressed }) => [styles.spinButton, (candidates.length < 2 || spinning) && styles.disabled, pressed && styles.pressed]}>
          <Text style={styles.spinText}>{spinning ? '돌리는 중...' : '돌림판 돌리기'}</Text>
        </Pressable>
        {winner ? <Text accessibilityLiveRegion="polite" style={styles.winner}>오늘은 {winner.name}!</Text> : null}
        {candidates.length < 2 ? <Text style={styles.hint}>돌리려면 식당을 2곳 이상 담아주세요.</Text> : null}
        <Text style={styles.sectionTitle}>후보 {candidates.length}/8</Text>
        {candidates.length === 0 ? <Text style={styles.empty}>홈에서 식당을 선택해 후보에 담아보세요.</Text> : candidates.map((candidate) => (
          <View key={candidate.id} style={styles.candidateRow}>
            <Text style={styles.candidateName}>{candidate.name}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={`${candidate.name} 후보 제거`}
              disabled={spinning} onPress={() => { removeCandidate(candidate.id); setWinner(null); }} style={styles.removeButton}>
              <Ionicons name="close-circle-outline" size={24} color="#64748B" />
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFF9F5' },
  header: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16 },
  iconButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#1F2937', fontSize: 21, fontWeight: '800' },
  content: { padding: 24, paddingBottom: 48 },
  description: { color: '#475569', fontSize: 15, lineHeight: 23, textAlign: 'center' },
  wheelArea: { alignItems: 'center', marginTop: 24 },
  pointer: { position: 'absolute', zIndex: 1, top: -4, width: 0, height: 0, borderLeftWidth: 14, borderRightWidth: 14, borderTopWidth: 25, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#1F2937' },
  spinButton: { backgroundColor: '#C2410C', borderRadius: 14, minHeight: 52, marginTop: 24, alignItems: 'center', justifyContent: 'center' },
  spinText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.75 },
  winner: { color: '#9A3412', fontSize: 22, fontWeight: '800', textAlign: 'center', marginTop: 20 },
  hint: { color: '#64748B', fontSize: 14, textAlign: 'center', marginTop: 16 },
  sectionTitle: { color: '#1F2937', fontSize: 19, fontWeight: '700', marginTop: 32, marginBottom: 12 },
  empty: { color: '#64748B', fontSize: 15 },
  candidateRow: { backgroundColor: '#FFFFFF', borderRadius: 12, paddingLeft: 16, paddingRight: 4, minHeight: 54, flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  candidateName: { flex: 1, color: '#334155', fontSize: 16, fontWeight: '600' },
  removeButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
});
