import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../src/components/AppHeader';

type TabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];
type IconName = React.ComponentProps<typeof Ionicons>['name'];

const tabs: Record<string, { label: string; icon: IconName; activeIcon: IconName }> = {
  index: { label: '홈', icon: 'home-outline', activeIcon: 'home' },
  community: { label: '커뮤니티', icon: 'people-outline', activeIcon: 'people' },
  map: { label: '지도', icon: 'map-outline', activeIcon: 'map' },
  chat: { label: '채팅', icon: 'chatbubble-ellipses-outline', activeIcon: 'chatbubble-ellipses' },
  profile: { label: '마이', icon: 'person-outline', activeIcon: 'person' },
};

function FloatingTabBar({ state, emitter, navigateToTab }: TabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.tabBar, { bottom: Math.max(insets.bottom, 12) + 8 }]}>
      {state.routes.map((route, index) => {
        const tab = tabs[route.name];
        const selected = state.index === index;
        return (
          <Pressable key={route.key} accessibilityRole="tab" accessibilityLabel={`${tab.label} 탭`}
            accessibilityState={{ selected }}
            onPress={() => {
              const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!selected && !event.defaultPrevented) navigateToTab(route.key);
            }}
            style={({ pressed }) => [styles.tab, selected && styles.activeTab, pressed && styles.pressedTab]}>
            <Ionicons name={selected ? tab.activeIcon : tab.icon} size={25} color="#FFFFFF" />
            <Text numberOfLines={1} style={[styles.tabLabel, selected && styles.activeTabLabel]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  return (
      <Tabs tabBar={(props) => <FloatingTabBar {...props} />} screenOptions={{ header: () => <AppHeader /> }}>
        <Tabs.Screen name="index" options={{ title: '홈' }} />
        <Tabs.Screen name="community" options={{ title: '커뮤니티' }} />
        <Tabs.Screen name="map" options={{ title: '지도' }} />
        <Tabs.Screen name="chat" options={{ title: '채팅' }} />
        <Tabs.Screen name="profile" options={{ title: '마이' }} />
      </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: { position: 'absolute', left: 16, right: 16, height: 76, borderRadius: 38, padding: 6, flexDirection: 'row', alignItems: 'center', backgroundColor: '#292A30', borderWidth: 1, borderColor: '#56575C', shadowColor: '#000000', shadowOpacity: 0.24, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
  tab: { flex: 1, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', gap: 3 },
  activeTab: { backgroundColor: '#16171C' },
  pressedTab: { opacity: 0.7 },
  tabLabel: { color: '#F8FAFC', fontSize: 11, fontWeight: '500' },
  activeTabLabel: { color: '#FFFFFF', fontWeight: '700' },
});
