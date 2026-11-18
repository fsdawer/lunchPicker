import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { areas } from '../features/restaurants/areas';
import { useArea } from '../features/restaurants/AreaContext';

type Panel = 'area' | 'notifications' | 'menu' | null;
type IconName = React.ComponentProps<typeof Ionicons>['name'];

const menuItems: { label: string; icon: IconName; href: Href }[] = [
  { label: '홈', icon: 'home-outline', href: '/' },
  { label: '커뮤니티', icon: 'people-outline', href: '/community' },
  { label: '지도', icon: 'map-outline', href: '/map' },
  { label: '채팅', icon: 'chatbubble-ellipses-outline', href: '/chat' },
  { label: '마이', icon: 'person-outline', href: '/profile' },
  { label: '돌림판', icon: 'disc-outline', href: '/roulette' },
];

function HeaderAction({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
      style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
      <Ionicons name={icon} size={24} color="#1F2937" />
    </Pressable>
  );
}

export function AppHeader() {
  const { area, setArea } = useArea();
  const insets = useSafeAreaInsets();
  const [panel, setPanel] = useState<Panel>(null);

  return (
    <>
      <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel={`현재 위치 ${area.name}, 변경하기`}
            accessibilityState={{ expanded: panel === 'area' }} onPress={() => setPanel('area')}
            style={({ pressed }) => [styles.locationButton, pressed && styles.pressed]}>
            <Ionicons name="location-sharp" size={21} color="#C2410C" />
            <Text numberOfLines={1} style={styles.locationText}>{area.name}</Text>
            <Ionicons name="chevron-down" size={17} color="#475569" />
          </Pressable>
          <View style={styles.actions}>
            <HeaderAction icon="search-outline" label="검색" onPress={() => router.push('/search')} />
            <HeaderAction icon="notifications-outline" label="알림" onPress={() => setPanel('notifications')} />
            <HeaderAction icon="menu-outline" label="메뉴" onPress={() => setPanel('menu')} />
          </View>
        </View>
      </SafeAreaView>
      <Modal transparent animationType="fade" visible={panel !== null} onRequestClose={() => setPanel(null)}>
        <View style={styles.modalRoot}>
          <Pressable accessibilityLabel="닫기" style={styles.backdrop} onPress={() => setPanel(null)} />
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
            <View style={styles.sheetHeading}>
              <Text style={styles.sheetTitle}>{panel === 'area' ? '지역 선택' : panel === 'notifications' ? '알림' : '메뉴'}</Text>
              <HeaderAction icon="close" label="닫기" onPress={() => setPanel(null)} />
            </View>
            {panel === 'area' ? (
              <>
                <Text style={styles.sheetDescription}>선택한 역에서 3 km 이내 음식점을 보여드려요.</Text>
                {areas.map((option) => (
                  <Pressable key={option.id} accessibilityRole="button" accessibilityLabel={`${option.name} 선택`}
                    accessibilityState={{ selected: area.id === option.id }} onPress={() => { setArea(option); setPanel(null); }}
                    style={({ pressed }) => [styles.sheetRow, pressed && styles.pressed]}>
                    <Ionicons name="location-outline" size={22} color="#C2410C" />
                    <Text style={styles.sheetRowText}>{option.name}</Text>
                    {area.id === option.id ? <Ionicons name="checkmark" size={22} color="#C2410C" /> : null}
                  </Pressable>
                ))}
              </>
            ) : panel === 'menu' ? menuItems.map((item) => (
              <Pressable key={item.label} accessibilityRole="button" onPress={() => { setPanel(null); router.navigate(item.href); }}
                style={({ pressed }) => [styles.sheetRow, pressed && styles.pressed]}>
                <Ionicons name={item.icon} size={22} color="#334155" />
                <Text style={styles.sheetRowText}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={18} color="#64748B" />
              </Pressable>
            )) : (
              <Text style={styles.sheetDescription}>알림 기능은 다음 단계에서 제공할게요.</Text>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  headerSafeArea: { backgroundColor: '#FFF9F5' },
  header: { minHeight: 64, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  locationButton: { minHeight: 48, flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, borderRadius: 12 },
  locationText: { flexShrink: 1, color: '#1F2937', fontSize: 20, fontWeight: '800' },
  actions: { flexDirection: 'row', alignItems: 'center' },
  iconButton: { width: 44, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  pressed: { opacity: 0.55 },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(15, 23, 42, 0.46)' },
  sheet: { backgroundColor: '#FFF9F5', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12 },
  sheetHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 52 },
  sheetTitle: { color: '#1F2937', fontSize: 21, fontWeight: '800' },
  sheetDescription: { color: '#475569', fontSize: 15, lineHeight: 23, paddingVertical: 16 },
  sheetRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 14, borderBottomWidth: 1, borderBottomColor: '#E9DED7' },
  sheetRowText: { flex: 1, color: '#1F2937', fontSize: 16, fontWeight: '600' },
});
