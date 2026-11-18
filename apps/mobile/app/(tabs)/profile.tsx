import { router, type Href } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../src/features/auth/AuthContext';

export default function ProfileScreen() {
  const { user, loading, signOut } = useAuth();
  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;
  return <View style={styles.screen}>
    <Text style={styles.title}>{user ? `${user.displayName}님` : '로그인이 필요해요'}</Text>
    {user && <Text style={styles.loginId}>{user.loginId}</Text>}
    <Pressable accessibilityRole="button" onPress={() => user ? void signOut() : router.push('/auth' as Href)} style={styles.button}>
      <Text style={styles.buttonText}>{user ? '로그아웃' : '로그인 / 회원가입'}</Text>
    </Pressable>
  </View>;
}
const styles = StyleSheet.create({ screen: { flex: 1, padding: 24, backgroundColor: '#FFF9F5' }, title: { fontSize: 22, fontWeight: '800', marginTop: 24 }, loginId: { marginTop: 8, color: '#64748B' }, button: { marginTop: 24, minHeight: 52, backgroundColor: '#C2410C', borderRadius: 12, justifyContent: 'center', alignItems: 'center' }, buttonText: { color: '#fff', fontWeight: '700' } });
